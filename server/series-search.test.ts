import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { alertsForSeries, refreshSeriesMetadata, getSeriesAlerts, dismissSeriesAlert } from "./series";
import { insertRecommendationSchema, recommendations, seriesCatalog } from "../shared/schema";
import { storage } from "./storage";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import { smartSearch } from "./tmdb";

test("series alerts distinguish announcements, confirmed premieres and manual dates", () => {
  const item = {
    id: 77, title: "Returning series", status: "Watched", lastKnownSeasons: 1, seasons: 1,
    seriesHistory: [], nextSeasonDate: null as string | null, dismissedSeriesAlerts: [] as string[],
  };
  assert.equal(alertsForSeries(item, [{ season: 2, date: null }], "2026-11-17")[0].kind, "announced");
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2026-12-01" }], "2026-11-17")[0].kind, "announced");
  const released = alertsForSeries(item, [{ season: 2, date: "2026-11-17" }], "2026-11-17");
  assert.equal(released[0].kind, "airing");
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2026-11-17" }], "2026-11-17", "2026-11-16")[0].kind, "announced");
  item.dismissedSeriesAlerts = ["77:2:announced"];
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2026-12-01" }], "2026-11-17").length, 0);
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2027-01-01" }], "2026-11-17").length, 0, "reschedule is not another announcement");
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2026-11-17" }], "2026-11-17")[0].kind, "airing", "release is a distinct event");
  item.dismissedSeriesAlerts = [];
  item.nextSeasonDate = "2026-11-01";
  assert.equal(alertsForSeries(item, [], "2026-11-17")[0].kind, "announced", "a manual date alone cannot prove airing");
  assert.equal(alertsForSeries(item, [{ season: 0, date: "2026-11-01" }], "2026-11-17").length, 1, "specials do not add alerts");
});

test("manual date validation rejects impossible dates and clients cannot overwrite history", () => {
  const schema = insertRecommendationSchema.partial();
  assert.equal(schema.safeParse({ nextSeasonDate: "2026-02-30" }).success, false);
  assert.equal(schema.safeParse({ nextSeasonDate: "2028-02-29" }).success, true);
  assert.deepEqual(schema.parse({ seriesHistory: [], dismissedSeriesAlerts: ["fake"] }), {});
});

test("returning a series preserves history, saved fields, identity and persistent priority order", async () => {
  const userId = `series-check-${randomUUID()}`;
  try {
    const make = (title: string, extra = {}) => storage.createRecommendation({
      userId, title, type: "TV Show", ...extra,
    });
    const first = await make("Already top", { sortOrder: 0 });
    const middle = await make("Null order", { sortOrder: null });
    const oldDate = new Date("2025-01-02T00:00:00Z");
    const watched = await make("Returning", {
      status: "Watched", watchedAt: oldDate, seasons: 1, lastKnownSeasons: 1,
      hotRating: 4.5, notes: "Keep my notes", watchReview: "Loved the first season", watchWith: "Test Person",
    });
    const returned = await storage.updateRecommendation(watched.id, { status: "Want to Watch", nextSeasonDate: "2027-01-10" });
    assert.equal(returned.id, watched.id);
    assert.equal(returned.notes, watched.notes);
    assert.equal(returned.watchReview, watched.watchReview);
    assert.equal(returned.hotRating, watched.hotRating);
    assert.equal(returned.watchWith, watched.watchWith);
    assert.equal(returned.watchedAt?.getTime(), oldDate.getTime());
    const { alertsAcknowledgedAt, ...previousViewing } = returned.seriesHistory[0];
    assert.ok(alertsAcknowledgedAt);
    assert.deepEqual(previousViewing, {
      watchedAt: oldDate.toISOString(), seasons: 1, rating: 4.5, review: "Loved the first season",
    });
    let order = (await storage.getRecommendations(userId)).map(i => i.id);
    assert.deepEqual(order, [watched.id, middle.id, first.id]);
    await storage.updateRecommendation(first.id, { status: "Watch Soon" });
    order = (await storage.getRecommendations(userId)).map(i => i.id);
    assert.deepEqual(order, [first.id, watched.id, middle.id]);
    await storage.updateRecommendation(middle.id, { status: "Interested" });
    order = (await storage.getRecommendations(userId)).map(i => i.id);
    assert.deepEqual(order, [middle.id, first.id, watched.id]);
    const unchanged = await storage.updateRecommendation(watched.id, { notes: "Updated note" });
    assert.equal(unchanged.seriesHistory.length, 1);
    assert.equal(unchanged.nextSeasonDate, "2027-01-10");
    assert.equal(unchanged.hotRatedAt?.getTime(), watched.hotRatedAt?.getTime(), "no invented new rating");
    const completed = await storage.updateRecommendation(watched.id, { status: "Watched" });
    const sameStatus = await storage.updateRecommendation(watched.id, { status: "Watched" });
    assert.equal(sameStatus.watchedAt?.getTime(), completed.watchedAt?.getTime(), "editing watched does not change chronology");
  } finally {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
  }
});

test("concurrent duplicate attempts cannot create extra titles; movie and TV IDs stay distinct", async () => {
  const userId = `identity-check-${randomUUID()}`;
  try {
    const payload = { userId, title: "Collision", type: "TV Show", tmdbId: 987654321 };
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => storage.createRecommendation(payload)));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    assert.equal((await storage.getRecommendations(userId)).length, 1);
    await storage.createRecommendation({ ...payload, type: "Movie" });
    await storage.createRecommendation({ ...payload, tmdbId: 987654322 });
    assert.equal((await storage.getRecommendations(userId)).length, 3);
    assert.equal((await storage.findDuplicateRecommendation(userId, "Collision", "Movie", 987654321))?.type, "Movie");
    assert.equal(await storage.findDuplicateRecommendation(userId, "Collision", "TV Show", 987654323), undefined);
  } finally {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
  }
});

test("TMDB search preserves media identity and survives failed optional query variants", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.get("query") !== "Collision") return new Response("Unavailable", { status: 503 });
      return Response.json({ results: [
        { id: 123, media_type: "tv", name: "Collision", vote_average: 8 },
        { id: 123, media_type: "movie", title: "Collision", vote_average: 7 },
      ] });
    };
    const results = await smartSearch("Collision");
    assert.deepEqual(results.map(r => r.type).sort(), ["Movie", "TV Show"]);
    global.fetch = async () => new Response("Unavailable", { status: 503 });
    await assert.rejects(smartSearch("Collision"), /temporarily unavailable/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("known premiere dates trigger fresh verification before the weekly interval", async () => {
  const originalFetch = global.fetch;
  const tmdbId = -8675309;
  try {
    const today = new Date().toISOString().slice(0, 10);
    await db.insert(seriesCatalog).values({
      tmdbId, seasons: [{ season: 2, date: today }], checkedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    let calls = 0;
    global.fetch = async () => {
      calls++;
      return Response.json({ seasons: [{ season_number: 2, air_date: "2099-01-01" }] });
    };
    await refreshSeriesMetadata(tmdbId);
    assert.equal(calls, 1, "do not wait a week before checking a release");
    const [updated] = await db.select().from(seriesCatalog).where(eq(seriesCatalog.tmdbId, tmdbId));
    assert.equal(updated.seasons[0].date, "2099-01-01", "postponement respected");
    await refreshSeriesMetadata(tmdbId);
    assert.equal(calls, 1, "fresh catalog metadata reused");
  } finally {
    global.fetch = originalFetch;
    await db.delete(seriesCatalog).where(eq(seriesCatalog.tmdbId, tmdbId));
  }
});

test("season alerts and dismissals remain private and survive reloads without duplicates", async () => {
  const userId = `alerts-check-${randomUUID()}`;
  const otherUser = `other-${userId}`;
  const tmdbId = -8675310;
  try {
    await db.insert(seriesCatalog).values({
      tmdbId, seasons: [{ season: 1, date: "2025-01-01" }, { season: 2, date: "2099-01-01" }],
    });
    const first = await storage.createRecommendation({ userId, title: "Private series", type: "TV Show", tmdbId, status: "Watched", lastKnownSeasons: 1 });
    const other = await storage.createRecommendation({ userId: otherUser, title: "Other member series", type: "TV Show", tmdbId, status: "Watched", lastKnownSeasons: 1 });
    const before = await getSeriesAlerts(userId);
    assert.equal(before.length, 1);
    assert.equal(before[0].recommendationId, first.id);
    await dismissSeriesAlert(otherUser, before[0].id);
    assert.equal((await getSeriesAlerts(userId)).length, 1, "another account cannot dismiss this alert");
    await dismissSeriesAlert(userId, before[0].id);
    await dismissSeriesAlert(userId, before[0].id);
    assert.equal((await getSeriesAlerts(userId)).length, 0);
    assert.equal((await storage.getRecommendation(first.id))?.dismissedSeriesAlerts.length, 1);
    assert.equal((await getSeriesAlerts(otherUser))[0].recommendationId, other.id);
    await storage.updateRecommendation(other.id, { archived: true });
    assert.equal((await getSeriesAlerts(otherUser)).length, 0);
  } finally {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
    await db.delete(recommendations).where(eq(recommendations.userId, otherUser));
    await db.delete(seriesCatalog).where(eq(seriesCatalog.tmdbId, tmdbId));
  }
});

test("moving to My List clears acted-on alerts, but a later premiere is a new event", () => {
  const item = {
    id: 88, title: "Tracked series", status: "Want to Watch", lastKnownSeasons: 1, seasons: 1,
    seriesHistory: [{ watchedAt: "2025-01-01T00:00:00Z", seasons: 1, rating: 4, review: null,
      alertsAcknowledgedAt: "2026-11-17T00:00:00Z" }],
    nextSeasonDate: null, dismissedSeriesAlerts: [],
  };
  assert.deepEqual(alertsForSeries(item, [{ season: 2, date: null }], "2026-11-17"), []);
  assert.deepEqual(alertsForSeries(item, [{ season: 2, date: "2026-12-01" }], "2026-11-17"), []);
  assert.deepEqual(alertsForSeries(item, [{ season: 2, date: "2026-11-16" }], "2026-11-17"), []);
  assert.equal(alertsForSeries(item, [{ season: 2, date: "2026-11-18" }], "2026-11-18")[0].kind, "airing");
  assert.deepEqual(alertsForSeries({ ...item, status: "Watching" }, [{ season: 2, date: "2026-11-16" }], "2026-11-17"), []);
});

test("alert acknowledgement also repairs already-returned series without changing viewing history", async () => {
  const userId = `acknowledgement-check-${randomUUID()}`;
  const tmdbId = -8675311;
  try {
    await db.insert(seriesCatalog).values({ tmdbId, seasons: [{ season: 2, date: "2020-01-01" }] });
    const item = await storage.createRecommendation({
      userId, title: "Already returned", type: "TV Show", tmdbId, status: "Watched",
      lastKnownSeasons: 1, hotRating: 4.5, notes: "Keep this", watchReview: "Original review",
    });
    assert.equal((await getSeriesAlerts(userId)).length, 1);
    const moved = await storage.updateRecommendation(item.id, { status: "Want to Watch" });
    assert.equal((await getSeriesAlerts(userId)).length, 0);
    assert.ok(moved.seriesHistory[0].alertsAcknowledgedAt);
    // Reproduce a title moved using the earlier version, with no acknowledgement.
    const { alertsAcknowledgedAt: _, ...oldHistory } = moved.seriesHistory[0];
    await db.update(recommendations).set({ seriesHistory: [oldHistory] }).where(eq(recommendations.id, item.id));
    assert.equal((await getSeriesAlerts(userId)).length, 0);
    const repaired = await storage.getRecommendation(item.id);
    assert.ok(repaired?.seriesHistory[0].alertsAcknowledgedAt);
    const { alertsAcknowledgedAt: firstAcknowledgement, ...repairedHistory } = repaired!.seriesHistory[0];
    assert.deepEqual(repairedHistory, oldHistory);
    assert.equal(repaired?.notes, "Keep this");
    assert.equal(repaired?.hotRating, 4.5);
    assert.equal(repaired?.watchReview, "Original review");
    await getSeriesAlerts(userId);
    assert.equal((await storage.getRecommendation(item.id))?.seriesHistory[0].alertsAcknowledgedAt, firstAcknowledgement);
  } finally {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
    await db.delete(seriesCatalog).where(eq(seriesCatalog.tmdbId, tmdbId));
  }
});

test.after(async () => { await pool.end(); });
