-- Run this in Supabase → SQL Editor

-- 1. Summary: total plays, unique artists, top genre
CREATE OR REPLACE FUNCTION get_summary(period text DEFAULT 'all')
RETURNS TABLE(total_plays bigint, unique_artists bigint, top_genre text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH filtered AS (
    SELECT p.id, p.track_id
    FROM plays p
    WHERE (
      period = 'all'
      OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
      OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
    )
  ),
  top_genre_cte AS (
    SELECT UNNEST(t.tags) AS genre
    FROM filtered f
    JOIN tracks t ON t.id = f.track_id
    GROUP BY genre
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    COUNT(f.id)::bigint,
    COUNT(DISTINCT t.artist)::bigint,
    COALESCE((SELECT genre FROM top_genre_cte LIMIT 1), '—')
  FROM filtered f
  JOIN tracks t ON t.id = f.track_id;
$$;

-- 2. Top tracks
CREATE OR REPLACE FUNCTION get_top_tracks(period text DEFAULT 'all', lim int DEFAULT 10)
RETURNS TABLE(name text, artist text, play_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.name, t.artist, COUNT(p.id)::bigint AS play_count
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE (
    period = 'all'
    OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY t.name, t.artist
  ORDER BY play_count DESC
  LIMIT lim;
$$;

-- 3. Top artists
CREATE OR REPLACE FUNCTION get_top_artists(period text DEFAULT 'all', lim int DEFAULT 10)
RETURNS TABLE(artist text, play_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.artist, COUNT(p.id)::bigint AS play_count
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE (
    period = 'all'
    OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY t.artist
  ORDER BY play_count DESC
  LIMIT lim;
$$;

-- 4. Genre distribution
CREATE OR REPLACE FUNCTION get_genre_distribution(period text DEFAULT 'all', lim int DEFAULT 10)
RETURNS TABLE(genre text, play_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT UNNEST(t.tags)::text AS genre, COUNT(p.id)::bigint AS play_count
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE (
    period = 'all'
    OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY genre
  ORDER BY play_count DESC
  LIMIT lim;
$$;

-- 5. Listening heatmap (hour × day of week)
CREATE OR REPLACE FUNCTION get_listening_heatmap(period text DEFAULT 'all')
RETURNS TABLE(hour int, dow int, play_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXTRACT(HOUR FROM played_at)::int AS hour,
    EXTRACT(DOW  FROM played_at)::int AS dow,
    COUNT(*)::bigint AS play_count
  FROM plays
  WHERE (
    period = 'all'
    OR (period = 'week'  AND played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY hour, dow;
$$;
