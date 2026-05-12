import { pool } from "./db";
import { log } from "./index";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function getImdbId(tmdbId: number, mediaType: "movie" | "tv"): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${TMDB_BASE}/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch { return null; }
}

async function fetchMdbListRatings(imdbId: string): Promise<{ imdbRating: number | null; rtRating: number | null }> {
  const apiKey = process.env.MDBLIST_API_KEY;
  if (!apiKey) return { imdbRating: null, rtRating: null };
  try {
    const res = await fetch(`https://mdblist.com/api/?apikey=${apiKey}&i=${imdbId}`);
    if (!res.ok) return { imdbRating: null, rtRating: null };
    const data = await res.json();
    if (!data.ratings) return { imdbRating: null, rtRating: null };
    const ratings: any[] = data.ratings;
    const imdbEntry = ratings.find((r: any) => r.source === "imdb");
    const rtEntry = ratings.find((r: any) => r.source === "tomatoes");
    const imdbRating = imdbEntry?.value != null ? Math.round(imdbEntry.value * 10) / 10 : null;
    const rtRating = rtEntry?.value != null ? Math.round(rtEntry.value) : null;
    return { imdbRating, rtRating };
  } catch { return { imdbRating: null, rtRating: null }; }
}

async function enrichItem(id: number, tmdbId: number, mediaType: string): Promise<void> {
  const type = mediaType === "Movie" ? "movie" : "tv";
  const imdbId = await getImdbId(tmdbId, type);
  if (!imdbId) return;
  const { imdbRating, rtRating } = await fetchMdbListRatings(imdbId);
  if (imdbRating === null && rtRating === null) return;
  await pool.query(
    "UPDATE recommendations SET imdb_rating = COALESCE($1, imdb_rating), rt_rating = COALESCE($2, rt_rating) WHERE id = $3",
    [imdbRating, rtRating, id]
  );
}

export async function runOmdbEnrichment(): Promise<void> {
  if (!process.env.MDBLIST_API_KEY) return;
  try {
    // Re-process anything missing RT rating — MDBList has much better RT coverage than OMDb
    const result = await pool.query(
      "SELECT id, tmdb_id, type FROM recommendations WHERE tmdb_id IS NOT NULL AND rt_rating IS NULL ORDER BY id DESC"
    );
    const items = result.rows;
    if (items.length === 0) return;
    log(`MDBList enrichment: updating ${items.length} items...`, "mdblist");

    for (const row of items) {
      await enrichItem(row.id, row.tmdb_id, row.type);
      await new Promise(r => setTimeout(r, 1200));
    }
    log(`MDBList enrichment: done`, "mdblist");
  } catch (err: any) {
    log(`MDBList enrichment error: ${err.message}`, "mdblist");
  }
}
