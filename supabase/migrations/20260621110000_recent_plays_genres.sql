DROP FUNCTION IF EXISTS public.get_recent_plays(integer);
CREATE OR REPLACE FUNCTION public.get_recent_plays(lim integer DEFAULT 15)
 RETURNS TABLE(title text, artist text, album text, played_at timestamp with time zone, image_url text, youtube_video_id text, genre_tags text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT p.title, p.artist, p.album, p.played_at, t.image_url, t.youtube_video_id, t.genre_tags
  FROM plays p
  LEFT JOIN tracks t ON t.id = p.track_id
  ORDER BY p.played_at DESC
  LIMIT lim;
$function$;
