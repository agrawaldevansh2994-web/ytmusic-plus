import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

import YouTube from "npm:youtube-sr";

// Rate limit: No more API limits! But we still batch to avoid Deno timeout (max 60s)
const DELAY_MS = 200;
const MAX_PER_RUN = 50; // Process 50 tracks per invocation

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchYouTube(query: string): Promise<string | null> {
  try {
    const video = await YouTube.default.searchOne(query, "video");
    return video?.id ?? null;
  } catch (err) {
    console.warn(`YouTube search failed for "${query}":`, err);
    return null;
  }
}

Deno.serve(async (_req: Request) => {

  // Fetch tracks that don't have a YouTube video ID yet
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
    // Try "Artist - Title" first, fall back to just title if needed
    const query = `${track.artist} - ${track.title}`;
    const videoId = await searchYouTube(query);

    if (videoId) {
      await supabase
        .from('tracks')
        .update({ youtube_video_id: videoId })
        .eq('id', track.id);
      resolved++;
    } else {
      // Mark as attempted with a sentinel so we don't retry forever
      await supabase
        .from('tracks')
        .update({ youtube_video_id: '__not_found__' })
        .eq('id', track.id);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: tracks.length,
      resolved,
      failed,
      remaining: tracks.length === MAX_PER_RUN ? 'more tracks pending — invoke again' : 'all done',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
