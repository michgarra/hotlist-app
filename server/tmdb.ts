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

async function getMdbListRatings(imdbId: string): Promise<{ imdbRating: number | null; rtRating: number | null }> {
  const apiKey = process.env.MDBLIST_API_KEY;
  if (!apiKey || !imdbId) return { imdbRating: null, rtRating: null };
  try {
    const res = await fetch(`https://mdblist.com/api/?apikey=${apiKey}&i=${imdbId}`);
    if (!res.ok) return { imdbRating: null, rtRating: null };
    const data = await res.json();
    if (!data.ratings) return { imdbRating: null, rtRating: null };
    const ratings: any[] = data.ratings;
    const imdbEntry = ratings.find((r) => r.source === "imdb");
    const rtEntry = ratings.find((r) => r.source === "tomatoes");
    const imdbRating = imdbEntry?.value != null ? Math.round(imdbEntry.value * 10) / 10 : null;
    const rtRating = rtEntry?.value != null ? Math.round(rtEntry.value) : null;
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

  // For person results, fetch full credits (known_for only returns 3 items)
  const personResults = data.results.filter((r: any) => r.media_type === "person");
  const creditArrays = await Promise.all(
    personResults.slice(0, 2).map(async (p: any) => {
      try {
        const credRes = await fetch(`${TMDB_BASE}/person/${p.id}/combined_credits?api_key=${apiKey}&language=en-US`);
        if (!credRes.ok) return p.known_for || [];
        const credData = await credRes.json();
        // Cast: only top-billed roles (order < 15 means they're a lead/major cast member)
        const castCredits = (credData.cast || [])
          .filter((c: any) => (c.media_type === "movie" || c.media_type === "tv") && c.poster_path && c.vote_count > 150 && c.order != null && c.order < 15);
        // Crew: only directing credits (avoids showing random docs where they were a producer/exec)
        const crewCredits = (credData.crew || [])
          .filter((c: any) => (c.media_type === "movie" || c.media_type === "tv") && c.poster_path && c.vote_count > 150 && c.job === "Director");
        const credits = [...castCredits, ...crewCredits]
          .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
        // Dedupe by id within this person's credits
        const seen = new Set<number>();
        return credits.filter((c: any) => seen.has(c.id) ? false : (seen.add(c.id), true)).slice(0, 15);
      } catch {
        return p.known_for || [];
      }
    })
  );

  const personCredits: TmdbSearchResult[] = creditArrays
    .flat()
    .filter((r: any) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
    .map((r: any) => ({
      id: r.id,
      title: r.media_type === "movie" ? (r.title || r.name) : (r.name || r.title),
      type: r.media_type === "movie" ? "Movie" : "TV Show",
      posterUrl: r.poster_path ? `${TMDB_IMG}/w342${r.poster_path}` : null,
      releaseDate: r.release_date || r.first_air_date || null,
      overview: r.overview || "",
      rating: Math.round((r.vote_average || 0) * 10) / 10,
    }));

  // If person credits found, lead with them — title results for a person name are
  // usually tribute docs / "Meryl Streep: ..." films, not what the user wants.
  // If no person results, fall back to title results as normal.
  if (personCredits.length > 0) {
    const seenIds = new Set(personCredits.map(r => r.id));
    const merged = [...personCredits];
    for (const r of titleResults) {
      if (!seenIds.has(r.id)) { seenIds.add(r.id); merged.push(r); }
    }
    return merged.slice(0, 15);
  }

  // No person match — return title results only
  return titleResults.slice(0, 15);
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

  // Fetch real IMDb + RT ratings from MDBList (imdb_id is in detail for movies, external_ids for TV)
  const imdbId: string | null = detail.imdb_id || externalIds.imdb_id || null;
  const mdbRatings = await getMdbListRatings(imdbId || "");

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
    imdbRating: mdbRatings.imdbRating ?? (detail.vote_average ? Math.round(detail.vote_average * 10) / 10 : null),
    rtRating: mdbRatings.rtRating,
    platform,
    censorRating,
  };
}
