import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { recommendations, seriesCatalog, type Recommendation } from "@shared/schema";

const WEEK = 7 * 24 * 60 * 60 * 1000;
function todayInAustralia(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export interface SeriesSeason { season: number; date: string | null }
export interface SeriesAlert {
  id: string;
  recommendationId: number;
  title: string;
  kind: "announced" | "airing";
  season: number;
  date: string | null;
}

export function alertsForSeries(
  item: Pick<Recommendation, "id" | "title" | "status" | "lastKnownSeasons" | "seasons" | "seriesHistory" | "nextSeasonDate" | "dismissedSeriesAlerts">,
  seasons: SeriesSeason[],
  today = todayInAustralia(),
  verifiedOn = today,
): SeriesAlert[] {
  const baseline = item.lastKnownSeasons ?? item.seriesHistory.at(-1)?.seasons ?? item.seasons;
  if (!baseline || (item.status !== "Watched" && !item.seriesHistory.length)) return [];
  const upcoming = seasons.filter(s => s.season > baseline && s.season > 0);
  // Manual dates can track a return even before TMDB recognises the season.
  if (item.nextSeasonDate && !upcoming.some(s => s.season === baseline + 1)) {
    upcoming.push({ season: baseline + 1, date: item.nextSeasonDate });
  }
  return upcoming.flatMap(s => {
    const date = s.season === baseline + 1 && item.nextSeasonDate ? item.nextSeasonDate : s.date;
    // A manually entered date is useful for tracking, but does not prove a
    // premiere happened. Confirm airing from recently revalidated TMDB data.
    const confirmed = seasons.find(metadata => metadata.season === s.season)?.date;
    const kind = confirmed && confirmed <= today && verifiedOn >= confirmed
      ? "airing" as const : "announced" as const;
    if (item.status !== "Watched") {
      // Returning this title to My List has already acted on its announcement.
      // Only a premiere AFTER that acknowledgement is a new actionable event.
      const acknowledgedAt = item.seriesHistory.at(-1)?.alertsAcknowledgedAt;
      if (kind === "announced" || !acknowledgedAt || confirmed! <= todayInAustralia(new Date(acknowledgedAt))) return [];
    }
    const id = `${item.id}:${s.season}:${kind}`;
    if (item.dismissedSeriesAlerts.includes(id)) return [];
    return [{ id, recommendationId: item.id, title: item.title, kind, season: s.season, date }];
  });
}

async function fetchSeriesSeasons(tmdbId: number): Promise<SeriesSeason[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB is not configured");
  const response = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${encodeURIComponent(apiKey)}&language=en-US`,
    { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Series metadata is temporarily unavailable");
  const data = await response.json();
  if (!Array.isArray(data.seasons)) throw new Error("Invalid series metadata");
  return data.seasons.filter((s: any) => Number.isInteger(s.season_number) && s.season_number > 0)
    .map((s: any) => ({
      season: s.season_number,
      date: typeof s.air_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.air_date) ? s.air_date : null,
    }));
}

/** Cross-process lease avoids redundant weekly fetches on autoscaled instances. */
export async function refreshSeriesMetadata(tmdbId: number): Promise<void> {
  const client = await pool.connect();
  try {
    const lock = await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [`series:${tmdbId}`]);
    if (!lock.rows[0].locked) return;
    try {
      const cached = await db.select().from(seriesCatalog).where(eq(seriesCatalog.tmdbId, tmdbId));
      const today = todayInAustralia();
      const releaseNeedsValidation = cached[0]?.seasons.some(s =>
        s.date && s.date <= today && s.date > todayInAustralia(cached[0].checkedAt));
      if (cached[0] && Date.now() - cached[0].checkedAt.getTime() < WEEK && !releaseNeedsValidation) return;
      const seasons = await fetchSeriesSeasons(tmdbId);
      await db.insert(seriesCatalog).values({ tmdbId, seasons, checkedAt: new Date() })
        .onConflictDoUpdate({ target: seriesCatalog.tmdbId, set: { seasons, checkedAt: new Date() } });
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [`series:${tmdbId}`]);
    }
  } finally {
    client.release();
  }
}

export async function getSeriesAlerts(userId: string): Promise<SeriesAlert[]> {
  const items = await db.select().from(recommendations).where(and(
    eq(recommendations.userId, userId), eq(recommendations.type, "TV Show"),
    sql`${recommendations.archived} IS NOT TRUE`,
  ));
  const ids = Array.from(new Set(items.flatMap(i => i.tmdbId ? [i.tmdbId] : [])));
  // Bounded concurrency; failed fetches do not turn cached metadata into an empty snapshot.
  const failed = new Set<number>();
  for (let offset = 0; offset < ids.length; offset += 4) {
    await Promise.all(ids.slice(offset, offset + 4).map(async id => {
      try { await refreshSeriesMetadata(id); } catch { failed.add(id); }
    }));
  }
  const alerts: SeriesAlert[] = [];
  for (let item of items) {
    if (item.status !== "Watched" && item.seriesHistory.length &&
      !item.seriesHistory.at(-1)?.alertsAcknowledgedAt) {
      // Compatibility for titles returned before automatic acknowledgement
      // existed. Record when alerts were cleared, NOT an invented move date.
      // Edit the current JSON value atomically to preserve concurrent edits.
      const [acknowledged] = await db.update(recommendations).set({
        seriesHistory: sql`jsonb_set(${recommendations.seriesHistory},
          ARRAY[(jsonb_array_length(${recommendations.seriesHistory}) - 1)::text, 'alertsAcknowledgedAt'],
          to_jsonb(${new Date().toISOString()}::text))`,
      }).where(and(eq(recommendations.id, item.id), eq(recommendations.userId, userId),
        sql`${recommendations.status} <> 'Watched'`,
        sql`jsonb_array_length(${recommendations.seriesHistory}) > 0`,
        sql`(${recommendations.seriesHistory} -> -1 ->> 'alertsAcknowledgedAt') IS NULL`)).returning();
      if (acknowledged) item = acknowledged;
    }
    const [cached] = item.tmdbId ? await db.select().from(seriesCatalog).where(eq(seriesCatalog.tmdbId, item.tmdbId)) : [];
    if (item.tmdbId && failed.has(item.tmdbId) && !cached) {
      throw new Error("Season announcements could not be checked. Please try again.");
    }
    alerts.push(...alertsForSeries(item, cached?.seasons || [], undefined,
      cached ? todayInAustralia(cached.checkedAt) : ""));
  }
  return alerts;
}

export async function dismissSeriesAlert(userId: string, id: string): Promise<void> {
  if (!/^\d+:\d+:(announced|airing)$/.test(id)) throw new Error("Invalid alert");
  const recommendationId = Number(id.split(":")[0]);
  await db.update(recommendations).set({
    dismissedSeriesAlerts: sql`ARRAY(SELECT DISTINCT unnest(array_append(${recommendations.dismissedSeriesAlerts}, ${id})))`,
  }).where(and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)));
}

/** Runs while the service is awake; opening the app also catches up after idle time. */
export function startSeriesRefresh(): void {
  const run = async () => {
    const ids = await db.selectDistinct({ tmdbId: recommendations.tmdbId }).from(recommendations)
      .where(and(eq(recommendations.type, "TV Show"), sql`${recommendations.archived} IS NOT TRUE`));
    for (const { tmdbId } of ids) {
      if (tmdbId) await refreshSeriesMetadata(tmdbId).catch(() => console.warn("Series metadata refresh deferred"));
    }
  };
  const timer = setInterval(() => { void run().catch(() => console.warn("Series refresh deferred")); }, 6 * 60 * 60 * 1000);
  timer.unref();
  void run().catch(() => console.warn("Series refresh deferred"));
}
