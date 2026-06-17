import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') ?? '';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Strip common suffixes that confuse Last.fm track lookup
function cleanTitle(title: string): string {
  return title
    // (From "Film Name" Soundtrack) / (From "Film Name")
    .replace(/\s*\(From\s+[""\u201c\u201d].*?[""\u201c\u201d][^)]*\)/gi, '')
    .replace(/\s*\[From\s+[""\u201c\u201d].*?[""\u201c\u201d][^)]*\]/gi, '')
    // (feat. X) / [feat. X] / (ft. X)
    .replace(/\s*[\(\[](feat|ft)\..*?[\)\]]/gi, '')
    // (Remix) / [Official Video] / (Live) etc
    .replace(/\s*[\(\[](remix|live|official|video|lyric|audio|version|edit)[^\)\]]*[\)\]]/gi, '')
    .trim();
}

async function fetchTagsForTrack(artist: string, track: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      method: 'track.getTopTags',
      artist,
      track: cleanTitle(track),
      api_key: LASTFM_API_KEY,
      format: 'json',
    });
    const res = await fetch(`${LASTFM_BASE}?${params}`);
    const data = await res.json();
    const tags: string[] = (data?.toptags?.tag ?? [])
      .slice(0, 5)
      .map((t: any) => t.name.toLowerCase())
      .filter((t: string) => t.length > 0 && t !== 'seen live');
    if (tags.length > 0) return tags;
  } catch { /* fall through */ }
  return [];
}

async function fetchTagsForArtist(artist: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      method: 'artist.getTopTags',
      artist,
      api_key: LASTFM_API_KEY,
      format: 'json',
    });
    const res = await fetch(`${LASTFM_BASE}?${params}`);
    const data = await res.json();
    return (data?.toptags?.tag ?? [])
      .slice(0, 5)
      .map((t: any) => t.name.toLowerCase())
      .filter((t: string) => t.length > 0 && t !== 'seen live');
  } catch {
    return [];
  }
}

async function fetchBestTags(artist: string, track: string): Promise<string[]> {
  // 1. Try track-level tags first
  const trackTags = await fetchTagsForTrack(artist, track);
  if (trackTags.length > 0) return trackTags;

  // 2. Fall back to artist-level tags
  return fetchTagsForArtist(artist);
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
    let skipped = 0;

    for (const track of tracks) {
      const tags = await fetchBestTags(track.artist, track.title);

      if (tags.length > 0) {
        await supabase
          .from('tracks')
          .update({ genre_tags: tags, updated_at: new Date().toISOString() })
          .eq('id', track.id);
        updated++;
      } else {
        skipped++;
      }

      // Stay well under Last.fm rate limit (5 req/s)
      await delay(220);
    }

    return new Response(
      JSON.stringify({ success: true, total: tracks.length, updated, skipped }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
