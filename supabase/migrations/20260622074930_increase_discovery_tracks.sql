CREATE OR REPLACE FUNCTION generate_smart_shuffle(playlist_size integer DEFAULT 25, target_genre text DEFAULT NULL)
RETURNS TABLE(title text, artist text, genre_tags text[], affinity_score numeric, tier text, youtube_video_id text)
LANGUAGE sql STABLE AS $$
  WITH filtered_tracks AS (
    SELECT t.*
    FROM tracks t
    WHERE (
       target_genre IS NULL
       OR target_genre = 'all'
       OR EXISTS (
          SELECT 1 FROM unnest(t.genre_tags) g
          WHERE g ILIKE '%' || REPLACE(target_genre, '-', '%') || '%'
             OR g ILIKE '%' || REPLACE(target_genre, ' ', '%') || '%'
       )
    )
    AND NOT EXISTS (
      SELECT 1 FROM unnest(t.genre_tags) g
      WHERE g ILIKE ANY(ARRAY['%hindi%', '%bollywood%', '%indian%', '%india%', '%punjabi%', '%tamil%', '%telugu%', '%desi%', '%bhangra%'])
    )
  ),
  scored_tracks AS (
    SELECT
      t.title,
      t.artist,
      t.youtube_video_id,
      COALESCE(t.genre_tags, '{}') AS genre_tags,
      COALESCE(tp.affinity_score, 0.05) AS affinity_score,
      CASE
        WHEN COALESCE(tp.affinity_score, 0) >= 0.6 THEN 'high'
        WHEN COALESCE(tp.affinity_score, 0) >= 0.3 THEN 'mid'
        ELSE 'low'
      END AS tier
    FROM filtered_tracks t
    LEFT JOIN taste_profile tp ON (
      tp.entity_type = 'track'
      AND tp.entity_name = LOWER(REPLACE(t.artist, ' ', '_') || '__' || REPLACE(t.title, ' ', '_'))
    )
  ),
  high_tier AS (
    SELECT *, 1 as bucket FROM scored_tracks WHERE tier = 'high'
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.20))
  ),
  mid_tier AS (
    SELECT *, 2 as bucket FROM scored_tracks WHERE tier = 'mid'
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.25))
  ),
  low_tier AS (
    SELECT *, 3 as bucket FROM scored_tracks WHERE tier = 'low'
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.55))
  ),
  combined AS (
    SELECT * FROM high_tier
    UNION ALL SELECT * FROM mid_tier
    UNION ALL SELECT * FROM low_tier
  ),
  remaining AS (
    SELECT s.*, 4 as bucket FROM scored_tracks s
    WHERE NOT EXISTS (
      SELECT 1 FROM combined c
      WHERE c.title = s.title AND c.artist = s.artist
    )
    ORDER BY s.affinity_score DESC, random()
  ),
  all_selected AS (
    SELECT * FROM combined
    UNION ALL
    SELECT * FROM remaining
  ),
  final_pool AS (
    SELECT *
    FROM all_selected
    ORDER BY bucket ASC
    LIMIT playlist_size
  )
  SELECT title, artist, genre_tags, affinity_score, tier, youtube_video_id
  FROM final_pool
  ORDER BY random();
$$;
