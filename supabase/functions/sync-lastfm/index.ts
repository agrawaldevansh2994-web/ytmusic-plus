import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') ?? '';
const LASTFM_USER = 'DevDevansh';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getLastSyncedAt(): Promise<number | null> {
  const { data } = await supabase
    .from('sync_state')
    .select('value')
    .eq('key', 'lastfm_last_synced_at')
    .single();
  return data?.value ? parseInt(data.value) : null;
}

async function updateLastSyncedAt(timestamp: number): Promise<void> {
  await supabase
    .from('sync_state')
    .update({ value: timestamp.toString(), updated_at: new Date().toISOString() })
    .eq('key', 'lastfm_last_synced_at');
}

async function fetchRecentTracks(from: number | null, page = 1): Promise<any> {
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: LASTFM_USER,
    api_key: LASTFM_API_KEY,
    format: 'json',
    limit: '200',
    page: page.toString(),
    extended: '1',
  });
  if (from) params.set('from', from.toString());

  const res = await fetch(`${LASTFM_BASE}?${params}`);
  if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);
  return res.json();
}

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

function cleanName(name: string): string {
  return name
    .replace(/ - Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*\(Official.*?\)/gi, '')
    .replace(/\s*\[Official.*?\]/gi, '')
    .replace(/\s*\(Lyric.*?\)/gi, '')
    .replace(/\s*\[Lyric.*?\]/gi, '')
    .trim();
}

Deno.serve(async (_req: Request) => {
  try {
    if (!LASTFM_API_KEY) {
      return new Response(JSON.stringify({ error: 'LASTFM_API_KEY not set' }), { status: 500 });
    }

    const lastSyncedAt = await getLastSyncedAt();
    let page = 1;
    let totalInserted = 0;
    let latestTimestamp = lastSyncedAt;
    let hasMorePages = true;

    while (hasMorePages) {
      const data = await fetchRecentTracks(lastSyncedAt, page);
      const recentTracks = data?.recenttracks;

      if (!recentTracks) throw new Error('Unexpected Last.fm response shape');

      const tracks: any[] = Array.isArray(recentTracks.track)
        ? recentTracks.track
        : [recentTracks.track];

      const totalPages = parseInt(recentTracks['@attr']?.totalPages ?? '1');

      const completedTracks = tracks.filter(
        (t: any) => t?.date?.uts && !t['@attr']?.nowplaying
      );

      for (const track of completedTracks) {
        const artist = cleanName(track.artist?.name ?? track.artist?.['#text'] ?? '');
        const title = cleanName(track.name ?? '');
        const album = track.album?.['#text'] ?? null;
        const mbid = track.mbid || null;
        const playedAt = new Date(parseInt(track.date.uts) * 1000).toISOString();
        const uts = parseInt(track.date.uts);

        if (!artist || !title) continue;

        if (!latestTimestamp || uts > latestTimestamp) {
          latestTimestamp = uts;
        }

        const genreTags = await fetchTrackTags(artist, title);

        // ── FIX: only include genre_tags in upsert if we got results ──────────
        // Prevents overwriting existing non-empty tags with [] on API failure
        const trackPayload: Record<string, unknown> = {
          video_id: mbid || `${artist}__${title}`.toLowerCase().replace(/\s+/g, '_'),
          title,
          artist,
          album,
          mbid,
          updated_at: new Date().toISOString(),
        };
        if (genreTags.length > 0) {
          trackPayload.genre_tags = genreTags;
        }

        const { data: trackRow } = await supabase
          .from('tracks')
          .upsert(trackPayload, { onConflict: 'video_id', ignoreDuplicates: false })
          .select('id')
          .single();

        if (!trackRow?.id) continue;

        const { error: playError } = await supabase.from('plays').upsert(
          {
            track_id: trackRow.id,
            video_id: mbid || `${artist}__${title}`.toLowerCase().replace(/\s+/g, '_'),
            title,
            artist,
            album,
            played_at: playedAt,
            lastfm_mbid: mbid,
            source: 'lastfm',
          },
          { onConflict: 'track_id,played_at', ignoreDuplicates: true }
        );

        if (!playError) totalInserted++;
      }

      hasMorePages = page < totalPages;
      page++;
    }

    if (latestTimestamp && latestTimestamp !== lastSyncedAt) {
      await updateLastSyncedAt(latestTimestamp);
    }

    return new Response(
      JSON.stringify({ success: true, inserted: totalInserted, cursor: latestTimestamp }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('sync-lastfm error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
