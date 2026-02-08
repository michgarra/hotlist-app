const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY not set");
  return key;
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  type: "Movie" | "TV Show";
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string;
  rating: number;
}

export interface TmdbDetails {
  id: number;
  title: string;
  type: "Movie" | "TV Show";
  posterUrl: string | null;
  overview: string;
  releaseDate: string | null;
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  cast: string[];
  director: string | null;
  imdbRating: number | null;
  platform: string | null;
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const apiKey = getApiKey();
  const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();

  return data.results
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 10)
    .map((r: any) => ({
      id: r.id,
      title: r.media_type === "movie" ? r.title : r.name,
      type: r.media_type === "movie" ? "Movie" : "TV Show",
      posterUrl: r.poster_path ? `${TMDB_IMG}/w342${r.poster_path}` : null,
      releaseDate: r.release_date || r.first_air_date || null,
      overview: r.overview || "",
      rating: Math.round((r.vote_average || 0) * 10) / 10,
    }));
}

export async function getTmdbDetails(tmdbId: number, mediaType: "movie" | "tv"): Promise<TmdbDetails> {
  const apiKey = getApiKey();

  const detailUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}?api_key=${apiKey}&language=en-US`;
  const creditsUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/credits?api_key=${apiKey}&language=en-US`;
  const providersUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/watch/providers?api_key=${apiKey}`;

  const [detailRes, creditsRes, providersRes] = await Promise.all([
    fetch(detailUrl),
    fetch(creditsUrl),
    fetch(providersUrl),
  ]);

  if (!detailRes.ok) throw new Error("TMDB detail fetch failed");

  const detail = await detailRes.json();
  const credits = creditsRes.ok ? await creditsRes.json() : { cast: [], crew: [] };
  const providers = providersRes.ok ? await providersRes.json() : { results: {} };

  const cast = (credits.cast || []).slice(0, 5).map((c: any) => c.name);
  const director = (credits.crew || []).find((c: any) => c.job === "Director")?.name || null;

  const auProviders = providers.results?.AU || providers.results?.US || {};
  const flatrate = auProviders.flatrate || [];
  const platform = flatrate.length > 0 ? flatrate[0].provider_name : null;

  return {
    id: detail.id,
    title: mediaType === "movie" ? detail.title : detail.name,
    type: mediaType === "movie" ? "Movie" : "TV Show",
    posterUrl: detail.poster_path ? `${TMDB_IMG}/w500${detail.poster_path}` : null,
    overview: detail.overview || "",
    releaseDate: detail.release_date || detail.first_air_date || null,
    runtime: mediaType === "movie" ? detail.runtime || null : null,
    seasons: mediaType === "tv" ? detail.number_of_seasons || null : null,
    episodes: mediaType === "tv" ? detail.number_of_episodes || null : null,
    genres: (detail.genres || []).map((g: any) => g.name),
    cast,
    director,
    imdbRating: detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null,
    platform,
  };
}
