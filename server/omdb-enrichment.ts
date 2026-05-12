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

async function fetchOmdbRatings(imdbId: string): Promise<{ imdbRating: number | null; rtRating: number | null }> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return { imdbRating: null, rtRating: null };
  try {
    const res = await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
    if (!res.ok) return { imdbRating: null, rtRating: null };
    const data = await res.json();
    if (data.Response === "False") return { imdbRating: null, rtRating: null };
    const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null;
    const rtEntry = (data.Ratings || []).find((r: any) => r.Source === "Rotten Tomatoes");
    const rtRating = rtEntry?.Value ? parseInt(rtEntry.Value.replace("%", ""), 10) || null : null;
    return { imdbRating, rtRating };
  } catch { return { imdbRating: null, rtRating: null }; }
}

async function enrichItem(id: number, tmdbId: number, mediaType: string): Promise<void> {
  const type = mediaType === "Movie" ? "movie" : "tv";
  const imdbId = await getImdbId(tmdbId, type);
  if (!imdbId) return;
  const { imdbRating, rtRating } = await fetchOmdbRatings(imdbId);
  if (imdbRating === null && rtRating === null) return;
  await pool.query(
    "UPDATE recommendations SET imdb_rating = COALESCE($1, imdb_rating), rt_rating = COALESCE($2, rt_rating) WHERE id = $3",
    [imdbRating, rtRating, id]
  );
}

export async function runOmdbEnrichment(): Promise<void> {
  if (!process.env.OMDB_API_KEY) return;
  try {
    const result = await pool.query(
      "SELECT id, tmdb_id, type FROM recommendations WHERE tmdb_id IS NOT NULL AND imdb_rating IS NULL AND rt_rating IS NULL ORDER BY id DESC"
    );
    const items = result.rows;
    if (items.length === 0) return;
    log(`OMDb enrichment: updating ${items.length} items...`, "omdb");

    for (const row of items) {
      await enrichItem(row.id, row.tmdb_id, row.type);
      await new Promise(r => setTimeout(r, 1500));
    }
    log(`OMDb enrichment: done`, "omdb");
  } catch (err: any) {
    log(`OMDb enrichment error: ${err.message}`, "omdb");
  }
}
