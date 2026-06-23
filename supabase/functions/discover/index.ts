import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Discover: surface genuinely NEW music (tracks the user has never scrobbled) ──
// The old Smart Shuffle could only resurface the user's own library because it
// selected FROM tracks. This pulls fresh candidates from Last.fm based on the
// user's taste (similar artists / similar tracks / genre top-tracks), then
// removes anything already in the library so the result is real discovery.

const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') ?? '';
const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Genre expansion — keep consistent with the frontend VIBES / smart-shuffle logic.
const GENRE_TAGS: Record<string, string[]> = {
  techno: ['techno', 'melodic techno', 'peak time techno'],
  schranz: ['schranz', 'hard techno', 'acid techno', 'dark techno'],
  house: ['house', 'deep house', 'tech house', 'melodic house'],
  trance: ['trance', 'psytrance', 'progressive trance'],
  rnb: ['rnb', 'contemporary r&b', 'alternative r&b'],
  'hip-hop': ['hip-hop', 'rap', 'trap'],
  pop: ['pop', 'dance pop', 'electropop'],
  indie: ['indie', 'indie rock', 'indie pop'],
  rock: ['rock', 'alternative rock', 'classic rock'],
};

const INDIAN_RX = /(hindi|bollywood|indian|india|punjabi|tamil|telugu|desi|bhangra)/i;

// Filter obvious non-songs that pollute Last.fm tag/similar feeds.
const NOISE_RX = /(live (at|@|in|from)| at .*(festival|arena|stadium|warehouse|club)|full set|dj set|\bset\b.*\b20\d\d|\bmix\b.*\b20\d\d|radio show|podcast|episode \d|\b20[0-2]\d\b)/i;
const NOISE_ARTISTS = new Set(['dj mag', 'bbc radio 1', 'triple j', 'boiler room', 'cercle', 'music on festival']);

interface Candidate {
  artist: string;
  title: string;
  image_url: string | null;
  reason: string;
  match: number; // 0..1 ranking weight
  tags: string[];
}

function lfmImage(images: any[] | undefined): string | null {
  if (!Array.isArray(images)) return null;
  const big = images.find((i) => i.size === 'extralarge') || images.find((i) => i.size === 'large');
  const url = big?.['#text'] || '';
  // Last.fm ships a known placeholder hash for missing art — treat as null.
  if (!url || url.includes('2a96cbd8b46e442fc41c2b86b821562f')) return null;
  return url;
}

async function lfm(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, api_key: LASTFM_API_KEY, format: 'json' });
  try {
    const res = await fetch(`${LASTFM_BASE}?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// iTunes Search API — free, keyless, reliable cover art (Last.fm no longer serves it).
async function itunesArt(artist: string, title: string): Promise<string | null> {
  const term = encodeURIComponent(`${artist} ${title}`);
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | undefined = data?.results?.[0]?.artworkUrl100;
    return url ? url.replace('100x100bb', '300x300bb').replace('100x100', '300x300') : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LASTFM_API_KEY) {
      return new Response(JSON.stringify({ error: 'LASTFM_API_KEY not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }
    const genre: string | null = body.genre && body.genre !== 'all' ? String(body.genre) : null;
    const size: number = Math.min(50, Math.max(5, Number(body.size) || 25));

    // ── 1. Known library: artist|||title set, plus known-artist set ─────────────
    const { data: known } = await supabase.from('tracks').select('artist, title');
    const knownTrack = new Set<string>();
    const knownArtist = new Set<string>();
    for (const r of known ?? []) {
      const a = (r.artist ?? '').toLowerCase().trim();
      const t = (r.title ?? '').toLowerCase().trim();
      if (a && t) knownTrack.add(`${a}|||${t}`);
      if (a) knownArtist.add(a);
    }

    // ── 2. Seeds: top non-Indian artists & tracks from the user's history ───────
    const { data: seedArtistsRows } = await supabase.rpc('get_discovery_seeds', { lim: 6 });
    const seedArtists: string[] = (seedArtistsRows ?? [])
      .map((r: any) => r.artist as string)
      .filter(Boolean);

    const { data: seedTrackRows } = await supabase.rpc('get_top_tracks', { period: 'all', lim: 4 });
    const seedTracks: { artist: string; title: string }[] = (seedTrackRows ?? [])
      .map((r: any) => ({ artist: r.artist as string, title: r.name as string }))
      .filter((t: any) => t.artist && t.title);

    const pool: Candidate[] = [];
    const push = (c: Candidate) => {
      if (!c.artist || !c.title) return;
      const a = c.artist.toLowerCase().trim();
      const t = c.title.toLowerCase().trim();
      if (knownTrack.has(`${a}|||${t}`)) return;     // already scrobbled this exact track
      if (INDIAN_RX.test(c.artist) || c.tags.some((tag) => INDIAN_RX.test(tag))) return;
      if (NOISE_ARTISTS.has(a) || NOISE_RX.test(c.title) || c.title.length > 60) return;
      pool.push(c);
    };

    if (genre) {
      // ── Genre mode: top tracks for the genre's tags ───────────────────────────
      const tags = GENRE_TAGS[genre] ?? [genre];
      const results = await Promise.all(
        tags.slice(0, 3).map((tag) => lfm({ method: 'tag.gettoptracks', tag, limit: '60' }))
      );
      results.forEach((data, ti) => {
        const tag = tags[ti];
        const tracks = data?.tracks?.track ?? [];
        for (const tr of tracks) {
          push({
            artist: tr.artist?.name ?? '',
            title: tr.name ?? '',
            image_url: lfmImage(tr.image),
            reason: `Top ${genre.replace('-', ' ')} right now`,
            match: 0.6,
            tags: [tag],
          });
        }
      });
    } else {
      // ── Taste mode: similar artists' top tracks + similar tracks ──────────────
      const simArtistData = await Promise.all(
        seedArtists.slice(0, 5).map((a) => lfm({ method: 'artist.getsimilar', artist: a, limit: '6' }))
      );

      // Gather fresh similar artists (skip ones the user already listens to).
      const similarArtists: { name: string; match: number; seed: string }[] = [];
      simArtistData.forEach((data, i) => {
        const seed = seedArtists[i];
        const arr = data?.similarartists?.artist ?? [];
        for (const a of arr) {
          const name = a.name as string;
          if (!name || knownArtist.has(name.toLowerCase().trim())) continue;
          similarArtists.push({ name, match: parseFloat(a.match ?? '0.5') || 0.5, seed });
        }
      });

      // Top tracks for the most-similar fresh artists.
      const topPick = similarArtists.sort((x, y) => y.match - x.match).slice(0, 12);
      const topData = await Promise.all(
        topPick.map((a) => lfm({ method: 'artist.gettoptracks', artist: a.name, limit: '3' }))
      );
      topData.forEach((data, i) => {
        const a = topPick[i];
        const tracks = data?.toptracks?.track ?? [];
        for (const tr of tracks) {
          push({
            artist: tr.artist?.name ?? a.name,
            title: tr.name ?? '',
            image_url: lfmImage(tr.image),
            reason: `Because you like ${a.seed}`,
            match: 0.5 + a.match * 0.5,
            tags: [],
          });
        }
      });

      // Similar tracks to the user's very top tracks.
      const simTrackData = await Promise.all(
        seedTracks.slice(0, 4).map((t) =>
          lfm({ method: 'track.getsimilar', artist: t.artist, track: t.title, limit: '12' })
        )
      );
      simTrackData.forEach((data, i) => {
        const seed = seedTracks[i];
        const tracks = data?.similartracks?.track ?? [];
        for (const tr of tracks) {
          push({
            artist: tr.artist?.name ?? '',
            title: tr.name ?? '',
            image_url: lfmImage(tr.image),
            reason: `Similar to ${seed.title}`,
            match: 0.55 + (parseFloat(tr.match ?? '0') || 0) * 0.45,
            tags: [],
          });
        }
      });
    }

    // ── 3. Dedupe (keep highest match), rank, lightly shuffle, trim ─────────────
    const best = new Map<string, Candidate>();
    for (const c of pool) {
      const key = `${c.artist.toLowerCase().trim()}|||${c.title.toLowerCase().trim()}`;
      const prev = best.get(key);
      if (!prev || c.match > prev.match) best.set(key, c);
    }

    const sorted = [...best.values()]
      // jitter keeps repeat generations fresh without losing the strong matches
      .map((c) => ({ c, sort: c.match + Math.random() * 0.25 }))
      .sort((a, b) => b.sort - a.sort)
      .map(({ c }) => c);

    // Variety: at most 2 tracks per artist so no single artist dominates.
    const perArtist = new Map<string, number>();
    const ranked: Candidate[] = [];
    for (const c of sorted) {
      if (ranked.length >= size) break;
      const a = c.artist.toLowerCase().trim();
      const n = perArtist.get(a) ?? 0;
      if (n >= 2) continue;
      perArtist.set(a, n + 1);
      ranked.push(c);
    }

    // Enrich with cover art from iTunes for any track missing an image.
    await Promise.all(
      ranked.map(async (c) => {
        if (!c.image_url) c.image_url = await itunesArt(c.artist, c.title);
      })
    );

    return new Response(
      JSON.stringify({
        recommendations: ranked,
        seeds: { artists: seedArtists, genre },
        pool_size: best.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('discover error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
