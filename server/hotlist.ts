// Each member gets one rating per title. Prefer their most recent rated
// entry if legacy duplicates exist, rather than giving duplicates extra votes.
export const HOTLIST_QUERY = `
  WITH member_titles AS (
    SELECT DISTINCT ON (user_id, tmdb_id) *
    FROM recommendations
    WHERE tmdb_id IS NOT NULL
    ORDER BY user_id, tmdb_id, (hot_rating IS NOT NULL) DESC,
      created_at DESC NULLS LAST, id DESC
  )
  SELECT
    tmdb_id,
    MAX(title) AS title,
    MAX(type) AS type,
    MAX(genre) AS genre,
    MAX(poster_url) AS poster_url,
    MAX(imdb_rating) AS imdb_rating,
    MAX(rt_rating) AS rt_rating,
    MAX(overview) AS overview,
    COUNT(*)::int AS user_count,
    ROUND(AVG(hot_rating)::numeric, 1) AS avg_hot_rating,
    COUNT(hot_rating)::int AS hot_rating_count
  FROM member_titles
  GROUP BY tmdb_id
  ORDER BY AVG(hot_rating) DESC NULLS LAST, COUNT(hot_rating) DESC,
    LOWER(MAX(title)) ASC, tmdb_id ASC
  LIMIT 50
`;
