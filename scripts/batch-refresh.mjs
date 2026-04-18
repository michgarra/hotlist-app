import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const TMDB_BASE = "https://api.themoviedb.org/3";
const apiKey = process.env.TMDB_API_KEY;

async function getTmdbMeta(tmdbId, mediaType) {
  const detailUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}?api_key=${apiKey}&language=en-US`;
  const ratingsUrl = mediaType === "movie"
    ? `${TMDB_BASE}/movie/${tmdbId}/release_dates?api_key=${apiKey}`
    : `${TMDB_BASE}/tv/${tmdbId}/content_ratings?api_key=${apiKey}`;

  const [detailRes, ratingsRes] = await Promise.all([fetch(detailUrl), fetch(ratingsUrl)]);
  if (!detailRes.ok) throw new Error(`TMDB detail failed for ${tmdbId}`);

  const detail = await detailRes.json();
  const ratingsData = ratingsRes.ok ? await ratingsRes.json() : { results: [] };

  // Extract AU certification, fall back to US
  let censorRating = null;
  if (mediaType === "movie") {
    const au = (ratingsData.results || []).find(r => r.iso_3166_1 === "AU");
    const us = (ratingsData.results || []).find(r => r.iso_3166_1 === "US");
    const entry = au || us;
    censorRating = entry
      ? ((entry.release_dates || []).find(rd => rd.certification)?.certification || null)
      : null;
  } else {
    const au = (ratingsData.results || []).find(r => r.iso_3166_1 === "AU");
    const us = (ratingsData.results || []).find(r => r.iso_3166_1 === "US");
    censorRating = (au || us)?.rating || null;
  }

  return {
    runtime: mediaType === "movie" ? (detail.runtime || null) : null,
    episodes: mediaType === "tv" ? (detail.number_of_episodes || null) : null,
    seasons: mediaType === "tv" ? (detail.number_of_seasons || null) : null,
    censorRating,
  };
}

async function run() {
  const { rows } = await pool.query(
    "SELECT id, title, type, tmdb_id FROM recommendations WHERE tmdb_id IS NOT NULL ORDER BY id"
  );

  console.log(`Updating ${rows.length} title(s)...\n`);

  for (const row of rows) {
    const mediaType = row.type === "Movie" ? "movie" : "tv";
    try {
      const meta = await getTmdbMeta(row.tmdb_id, mediaType);
      await pool.query(
        `UPDATE recommendations SET
          runtime = COALESCE($1, runtime),
          episodes = COALESCE($2, episodes),
          seasons = COALESCE($3, seasons),
          censor_rating = COALESCE($4, censor_rating)
        WHERE id = $5`,
        [meta.runtime, meta.episodes, meta.seasons, meta.censorRating, row.id]
      );
      const parts = [
        meta.runtime ? `${meta.runtime}min` : null,
        meta.episodes ? `${meta.episodes} eps` : null,
        meta.censorRating ? `[${meta.censorRating}]` : null,
      ].filter(Boolean);
      console.log(`✓ ${row.title} — ${parts.join(", ") || "no new data"}`);
    } catch (err) {
      console.log(`✗ ${row.title} — ${err.message}`);
    }
    // Respect TMDB rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  console.log("\nDone.");
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
