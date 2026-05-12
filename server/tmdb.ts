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
  backdropUrl: string | null;
  trailerKey: string | null;
  overview: string;
  releaseDate: string | null;
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  cast: string[];
  director: string | null;
  imdbRating: number | null;
  rtRating: number | null;
  platform: string | null;
  censorRating: string | null;
}

async function getOmdbRatings(imdbId: string): Promise<{ imdbRating: number | null; rtRating: number | null }> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || !imdbId) return { imdbRating: null, rtRating: null };
  try {
    const res = await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`);
    if (!res.ok) return { imdbRating: null, rtRating: null };
    const data = await res.json();
    if (data.Response === "False") return { imdbRating: null, rtRating: null };
    const imdbRating = data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null;
    const rtEntry = (data.Ratings || []).find((r: any) => r.Source === "Rotten Tomatoes");
    const rtRaw = rtEntry?.Value || null; // e.g. "89%"
    const rtRating = rtRaw ? parseInt(rtRaw.replace("%", ""), 10) || null : null;
    return { imdbRating, rtRating };
  } catch {
    return { imdbRating: null, rtRating: null };
  }
}

export async function searchTmdb(query: string): Promise<TmdbSearchResult[]> {
  const apiKey = getApiKey();
  const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB search failed");
  const data = await res.json();

  const titleResults: TmdbSearchResult[] = data.results
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8)
    .map((r: any) => ({
      id: r.id,
      title: r.media_type === "movie" ? r.title : r.name,
      type: r.media_type === "movie" ? "Movie" : "TV Show",
      posterUrl: r.poster_path ? `${TMDB_IMG}/w342${r.poster_path}` : null,
      releaseDate: r.release_date || r.first_air_date || null,
      overview: r.overview || "",
      rating: Math.round((r.vote_average || 0) * 10) / 10,
    }));

  // Extract known_for titles from any person results (actor/director search)
  const personResults = data.results.filter((r: any) => r.media_type === "person");
  const knownForResults: TmdbSearchResult[] = personResults
    .flatMap((p: any) => (p.known_for || []))
    .filter((r: any) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
    .map((r: any) => ({
      id: r.id,
      title: r.media_type === "movie" ? r.title : r.name,
      type: r.media_type === "movie" ? "Movie" : "TV Show",
      posterUrl: r.poster_path ? `${TMDB_IMG}/w342${r.poster_path}` : null,
      releaseDate: r.release_date || r.first_air_date || null,
      overview: r.overview || "",
      rating: Math.round((r.vote_average || 0) * 10) / 10,
    }));

  // Merge: title results first, then known_for (deduped by id)
  const seenIds = new Set(titleResults.map(r => r.id));
  const merged = [...titleResults];
  for (const r of knownForResults) {
    if (!seenIds.has(r.id)) { seenIds.add(r.id); merged.push(r); }
  }
  return merged.slice(0, 10);
}

export async function getTmdbSeasonCount(tmdbId: number): Promise<{ seasons: number; episodes: number }> {
  const apiKey = getApiKey();
  const url = `${TMDB_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("TMDB fetch failed");
  const data = await res.json();
  return {
    seasons: data.number_of_seasons || 0,
    episodes: data.number_of_episodes || 0,
  };
}

export async function getTmdbDetails(tmdbId: number, mediaType: "movie" | "tv"): Promise<TmdbDetails> {
  const apiKey = getApiKey();

  const detailUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}?api_key=${apiKey}&language=en-US`;
  const creditsUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/credits?api_key=${apiKey}&language=en-US`;
  const providersUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/watch/providers?api_key=${apiKey}`;
  const ratingsUrl = mediaType === "movie"
    ? `${TMDB_BASE}/movie/${tmdbId}/release_dates?api_key=${apiKey}`
    : `${TMDB_BASE}/tv/${tmdbId}/content_ratings?api_key=${apiKey}`;
  const videosUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/videos?api_key=${apiKey}&language=en-US`;
  const externalIdsUrl = `${TMDB_BASE}/${mediaType}/${tmdbId}/external_ids?api_key=${apiKey}`;

  const [detailRes, creditsRes, providersRes, ratingsRes, videosRes, externalIdsRes] = await Promise.all([
    fetch(detailUrl),
    fetch(creditsUrl),
    fetch(providersUrl),
    fetch(ratingsUrl),
    fetch(videosUrl),
    fetch(externalIdsUrl),
  ]);

  if (!detailRes.ok) throw new Error("TMDB detail fetch failed");

  const detail = await detailRes.json();
  const credits = creditsRes.ok ? await creditsRes.json() : { cast: [], crew: [] };
  const providers = providersRes.ok ? await providersRes.json() : { results: {} };
  const ratingsData = ratingsRes.ok ? await ratingsRes.json() : { results: [] };
  const videosData = videosRes.ok ? await videosRes.json() : { results: [] };
  const externalIds = externalIdsRes.ok ? await externalIdsRes.json() : {};

  // Fetch real IMDb + RT ratings from OMDb (imdb_id is in detail for movies, external_ids for TV)
  const imdbId: string | null = detail.imdb_id || externalIds.imdb_id || null;
  const omdbRatings = await getOmdbRatings(imdbId || "");

  const videoResults: any[] = videosData.results || [];
  const trailer =
    videoResults.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official !== false) ||
    videoResults.find((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  const trailerKey = trailer?.key || null;

  // Extract AU certification, fall back to US
  let censorRating: string | null = null;
  if (mediaType === "movie") {
    const auEntry = (ratingsData.results || []).find((r: any) => r.iso_3166_1 === "AU");
    const usEntry = (ratingsData.results || []).find((r: any) => r.iso_3166_1 === "US");
    const entry = auEntry || usEntry;
    if (entry) {
      const cert = (entry.release_dates || []).find((rd: any) => rd.certification)?.certification;
      censorRating = cert || null;
    }
  } else {
    const auEntry = (ratingsData.results || []).find((r: any) => r.iso_3166_1 === "AU");
    const usEntry = (ratingsData.results || []).find((r: any) => r.iso_3166_1 === "US");
    const entry = auEntry || usEntry;
    censorRating = entry?.rating || null;
  }

  const cast = (credits.cast || []).slice(0, 5).map((c: any) => c.name);
  const director = (credits.crew || []).find((c: any) => c.job === "Director")?.name || null;

  const CANONICAL: Record<string, string> = {
    "netflix": "Netflix",
    "netflix basic with ads": "Netflix",
    "amazon prime video": "Prime Video",
    "prime video": "Prime Video",
    "amazon video": "Prime Video",
    "disney plus": "Disney+",
    "disney+": "Disney+",
    "apple tv plus": "Apple TV+",
    "apple tv+": "Apple TV+",
    "apple itunes": "Apple TV+",
    "hbo max": "Max",
    "max": "Max",
    "hulu": "Hulu",
    "peacock": "Peacock",
    "peacock premium": "Peacock",
    "paramount plus": "Paramount+",
    "paramount+ apple tv channel": "Paramount+",
    "binge": "Binge",
    "stan": "Stan",
    "stan.": "Stan",
    "foxtel now": "Foxtel",
    "foxtel": "Foxtel",
    "kayo sports": "Kayo",
    "youtube premium": "YouTube Premium",
    "google play movies": "Google Play",
    "microsoft store": "Microsoft Store",
    "vudu": "Vudu",
  };

  const normalizePlatform = (name: string): string => {
    const key = name.toLowerCase().trim();
    return CANONICAL[key] || name;
  };

  const auProviders = providers.results?.AU || providers.results?.US || {};
  const flatrate = auProviders.flatrate || [];
  const seenNames = new Set<string>();
  const platformNames: string[] = [];
  for (const p of flatrate) {
    const canonical = normalizePlatform(p.provider_name);
    if (!seenNames.has(canonical) && platformNames.length < 3) {
      seenNames.add(canonical);
      platformNames.push(canonical);
    }
  }
  const platform = platformNames.length > 0 ? platformNames.join(", ") : null;

  return {
    id: detail.id,
    title: mediaType === "movie" ? detail.title : detail.name,
    type: mediaType === "movie" ? "Movie" : "TV Show",
    posterUrl: detail.poster_path ? `${TMDB_IMG}/w500${detail.poster_path}` : null,
    backdropUrl: detail.backdrop_path ? `${TMDB_IMG}/w1280${detail.backdrop_path}` : null,
    trailerKey,
    overview: detail.overview || "",
    releaseDate: detail.release_date || detail.first_air_date || null,
    runtime: mediaType === "movie" ? detail.runtime || null : null,
    seasons: mediaType === "tv" ? detail.number_of_seasons || null : null,
    episodes: mediaType === "tv" ? detail.number_of_episodes || null : null,
    genres: (detail.genres || []).map((g: any) => g.name),
    cast,
    director,
    imdbRating: omdbRatings.imdbRating ?? (detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null),
    rtRating: omdbRatings.rtRating,
    platform,
    censorRating,
  };
}
