import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const YT_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? '';
const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';

const DELAY_MS = 300;
const MAX_PER_RUN = 30;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchYouTube(query: string): Promise<string | null> {
  const url = `${YT_SEARCH}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&videoCategoryId=10&key=${YT_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`YouTube search failed for "${query}": ${res.status}`);
    return null;
  }
  const data = await res.json();
  return data?.items?.[0]?.id?.videoId ?? null;
}

Deno.serve(async (_req: Request) => {
  if (!YT_KEY) {
    return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY not set' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('id, title, artist')
    .is('youtube_video_id', null)
    .limit(MAX_PER_RUN);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!tracks?.length) {
    return new Response(JSON.stringify({ success: true, message: 'All tracks already resolved' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let resolved = 0;
  let failed = 0;

  for (const track of tracks) {
    const query = `${track.artist} - ${track.title}`;
    const videoId = await searchYouTube(query);

    if (videoId) {
      await supabase.from('tracks').update({ youtube_video_id: videoId }).eq('id', track.id);
      resolved++;
    } else {
      await supabase.from('tracks').update({ youtube_video_id: '__not_found__' }).eq('id', track.id);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  return new Response(
    JSON.stringify({ success: true, processed: tracks.length, resolved, failed,
      remaining: tracks.length === MAX_PER_RUN ? 'more tracks pending — invoke again' : 'all done' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
