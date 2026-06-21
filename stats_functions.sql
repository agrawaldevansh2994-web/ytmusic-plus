-- Run this in Supabase → SQL Editor
-- This file documents the live database functions & tables for ytmusic-plus.
-- Source of truth is what's deployed in Supabase; keep this synced after changes.

-- ════════════════════════════════════════════════════════════════════════
-- STATS (Dashboard)
-- ════════════════════════════════════════════════════════════════════════

-- 1. Summary: total plays, unique artists, top genre, total listening time
--    NOTE: total_duration_seconds is currently always 0 — Last.fm's
--    user.getrecenttracks (used by sync-lastfm) does not return track
--    duration, so plays.duration_seconds / tracks.duration_seconds are
--    never populated. Would need a track.getInfo backfill to fix.
CREATE OR REPLACE FUNCTION get_summary(period text DEFAULT 'all')
RETURNS TABLE(total_plays bigint, unique_artists bigint, top_genre text, total_duration_seconds bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH filtered AS (
    SELECT p.id, p.track_id, p.duration_seconds
    FROM plays p
    WHERE (
      period = 'all'
      OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
      OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
    )
  ),
  top_genre_cte AS (
    SELECT UNNEST(t.genre_tags) AS genre
    FROM filtered f
    JOIN tracks t ON t.id = f.track_id
    GROUP BY genre
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT
    COUNT(f.id)::bigint,
    COUNT(DISTINCT t.artist)::bigint,
    COALESCE((SELECT genre FROM top_genre_cte LIMIT 1), '—'),
    COALESCE(SUM(f.duration_seconds), 0)::bigint
  FROM filtered f
  JOIN tracks t ON t.id = f.track_id;
$$;

-- 2. Top tracks (now includes image_url + genre_tags for dashboard pills)
CREATE OR REPLACE FUNCTION get_top_tracks(period text DEFAULT 'all', lim int DEFAULT 10)
RETURNS TABLE(name text, artist text, play_count bigint, image_url text, genre_tags text[])
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT t.title AS name, t.artist, COUNT(p.id)::bigint AS play_count, t.image_url, t.genre_tags
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE (
    period = 'all'
    OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY t.id, t.title, t.artist, t.image_url, t.genre_tags
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
  SELECT UNNEST(t.genre_tags)::text AS genre, COUNT(p.id)::bigint AS play_count
  FROM plays p
  JOIN tracks t ON t.id = p.track_id
  WHERE (
    period = 'all'
    OR (period = 'week'  AND p.played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND p.played_at >= NOW() - INTERVAL '30 days')
  )
  AND t.genre_tags IS NOT NULL AND array_length(t.genre_tags, 1) > 0
  GROUP BY genre
  ORDER BY play_count DESC
  LIMIT lim;
$$;

-- 5. Listening heatmap (hour × day of week, IST)
CREATE OR REPLACE FUNCTION get_listening_heatmap(period text DEFAULT 'all')
RETURNS TABLE(hour int, dow int, play_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXTRACT(HOUR FROM played_at AT TIME ZONE 'Asia/Kolkata')::int AS hour,
    EXTRACT(DOW  FROM played_at AT TIME ZONE 'Asia/Kolkata')::int AS dow,
    COUNT(*)::bigint AS play_count
  FROM plays
  WHERE (
    period = 'all'
    OR (period = 'week'  AND played_at >= NOW() - INTERVAL '7 days')
    OR (period = 'month' AND played_at >= NOW() - INTERVAL '30 days')
  )
  GROUP BY hour, dow;
$$;

-- 6. Recent plays (new — powers the Dashboard "Recent plays" panel)
CREATE OR REPLACE FUNCTION get_recent_plays(lim int DEFAULT 15)
RETURNS TABLE(title text, artist text, album text, played_at timestamptz, image_url text, youtube_video_id text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.title, p.artist, p.album, p.played_at, t.image_url, t.youtube_video_id
  FROM plays p
  LEFT JOIN tracks t ON t.id = p.track_id
  ORDER BY p.played_at DESC
  LIMIT lim;
$$;

-- 7. YouTube match rate (new — powers the Dashboard "YT Matched" stat card)
CREATE OR REPLACE FUNCTION get_youtube_match_stats()
RETURNS TABLE(resolved bigint, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COUNT(*) FILTER (WHERE youtube_video_id IS NOT NULL AND youtube_video_id <> '__not_found__')::bigint AS resolved,
    COUNT(*)::bigint AS total
  FROM tracks;
$$;


-- ════════════════════════════════════════════════════════════════════════
-- TASTE PROFILE & SMART SHUFFLE
-- ════════════════════════════════════════════════════════════════════════

-- 8. Taste summary — top genres + persona, powers Shuffle page header
CREATE OR REPLACE FUNCTION get_taste_summary()
RETURNS TABLE(entity_type text, entity_name text, affinity_score double precision, play_count integer)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT entity_type, entity_name, affinity_score, play_count
  FROM taste_profile
  WHERE (entity_type = 'genre' AND entity_name NOT LIKE '__persona__%' AND affinity_score > 0.3)
     OR (entity_name LIKE '__persona__%')
  ORDER BY entity_type, affinity_score DESC;
$$;

-- 9. Smart shuffle generator — tiered 45/35/20 affinity sampling, filters
--    out Hindi/Bollywood/regional Indian genre tags by design.
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
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.45))
  ),
  mid_tier AS (
    SELECT *, 2 as bucket FROM scored_tracks WHERE tier = 'mid'
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.35))
  ),
  low_tier AS (
    SELECT *, 3 as bucket FROM scored_tracks WHERE tier = 'low'
    ORDER BY random() LIMIT GREATEST(1, ROUND(playlist_size * 0.20))
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


-- ════════════════════════════════════════════════════════════════════════
-- PLAYLISTS (history of auto-monthly + manual pushes — new)
-- ════════════════════════════════════════════════════════════════════════

-- 10. playlists table — snapshot-based (tracks stored as JSONB, not relational)
--     so history survives even if a track is later re-tagged or deleted.
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('auto_monthly', 'manual')),
  title text NOT NULL,
  youtube_playlist_id text,
  youtube_playlist_url text,
  requested_size int,
  target_genre text,
  track_count int NOT NULL DEFAULT 0,
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on playlists"
  ON public.playlists FOR SELECT
  TO anon, authenticated
  USING (true);

-- 11. log_manual_playlist — SECURITY DEFINER insert so the anon key can log
--     a manual push from Shuffle.tsx without an open INSERT policy on the table.
--     generate-monthly-playlist (edge function, service role) inserts directly.
CREATE OR REPLACE FUNCTION public.log_manual_playlist(
  p_title text,
  p_youtube_playlist_id text,
  p_youtube_playlist_url text,
  p_requested_size int,
  p_target_genre text,
  p_tracks jsonb
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.playlists (source, title, youtube_playlist_id, youtube_playlist_url, requested_size, target_genre, track_count, tracks)
  VALUES ('manual', p_title, p_youtube_playlist_id, p_youtube_playlist_url, p_requested_size, p_target_genre, jsonb_array_length(p_tracks), p_tracks)
  RETURNING id;
$$;
