// Product parameters: see docs/business-rules/hotlist-ranking.md.
export const HOTLIST_HALF_LIFE_DAYS = 30;
export const HOTLIST_SUPPORT_SCALE = 5;

export const HOTLIST_QUERY = `
  WITH member_titles AS (
    SELECT DISTINCT ON (user_id, tmdb_id) *
    FROM recommendations
    WHERE tmdb_id IS NOT NULL
    ORDER BY user_id, tmdb_id, (hot_rating IS NOT NULL) DESC,
      hot_rated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
  ), totals AS (
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
      AVG(hot_rating)::double precision AS raw_average,
      ROUND(AVG(hot_rating)::numeric, 1) AS avg_hot_rating,
      COUNT(hot_rating)::int AS hot_rating_count,
      COUNT(hot_rated_at) FILTER (WHERE hot_rating IS NOT NULL)::int AS dated_rating_count,
      MAX(hot_rated_at) FILTER (WHERE hot_rating IS NOT NULL) AS last_rated_at,
      COALESCE(SUM(
        CASE WHEN hot_rating IS NOT NULL AND hot_rated_at IS NOT NULL THEN
          POWER(0.5::double precision,
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - hot_rated_at))) /
              (${HOTLIST_HALF_LIFE_DAYS}.0 * 86400))
        ELSE 0 END
      ), 0)::double precision AS recent_weight
    FROM member_titles
    GROUP BY tmdb_id
    HAVING COUNT(hot_rating) > 0
  ), scored AS (
    SELECT totals.*,
      raw_average * hot_rating_count /
        (hot_rating_count + ${HOTLIST_SUPPORT_SCALE}) AS quality_score,
      CASE WHEN hot_rating_count >= 2 THEN 'ranked' ELSE 'early' END AS section
    FROM totals
  ), positioned AS (
    SELECT *,
      quality_score * recent_weight / hot_rating_count AS trending_score,
      ROW_NUMBER() OVER (
        PARTITION BY section
        ORDER BY quality_score * recent_weight / hot_rating_count DESC,
          quality_score DESC, hot_rating_count DESC,
          LOWER(title) ASC, tmdb_id ASC
      ) AS section_position
    FROM scored
  )
  SELECT * FROM positioned
  WHERE section_position <= 50
  ORDER BY CASE WHEN section = 'ranked' THEN 0 ELSE 1 END, section_position
`;
