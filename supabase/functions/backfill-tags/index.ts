import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') ?? '';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchTrackTags(artist: string, track: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      method: 'track.getTopTags',
      artist,
      track,
      api_key: LASTFM_API_KEY,
      format: 'json',
    });
    const res = await fetch(`${LASTFM_BASE}?${params}`);
    const data = await res.json();
    const tags = data?.toptags?.tag ?? [];
    return tags
      .slice(0, 5)
      .map((t: any) => t.name.toLowerCase())
      .filter((t: string) => t.length > 0);
  } catch {
    return [];
  }
}

Deno.serve(async (_req: Request) => {
  try {
    if (!LASTFM_API_KEY) {
      return new Response(JSON.stringify({ error: 'LASTFM_API_KEY not set' }), { status: 500 });
    }

    // Fetch all tracks with empty or null genre_tags
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('id, title, artist')
      .or('genre_tags.eq.{},genre_tags.is.null');

    if (error) throw error;

    if (!tracks?.length) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'All tracks already have tags' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let skipped = 0; // Last.fm had no tags for this track

    for (const track of tracks) {
      const tags = await fetchTrackTags(track.artist, track.title);

      if (tags.length > 0) {
        await supabase
          .from('tracks')
          .update({ genre_tags: tags, updated_at: new Date().toISOString() })
          .eq('id', track.id);
        updated++;
      } else {
        skipped++;
      }

      // Stay well under Last.fm's rate limit
      await delay(250);
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: tracks.length,
        updated,
        skipped, // tracks Last.fm doesn't have tags for
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
