import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ── Scoring constants ─────────────────────────────────────────────────────────
const RECENCY_HALF_LIFE_DAYS = 14;   // plays decay to 50% weight after 14 days
const LOYALTY_BONUS_THRESHOLD = 3;   // > 3 plays of same entity = loyalty bonus
const LOYALTY_BONUS_MULTIPLIER = 1.3;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PlayRow {
  played_at: string;
  artist: string;
  title: string;
  track_id: string | null;
}

interface TrackRow {
  id: string;
  title: string;
  artist: string;
  genre_tags: string[];
}

/** Exponential recency weight: recent plays score higher */
function recencyWeight(playedAt: string): number {
  const ageMs = Date.now() - new Date(playedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
}

/** Normalise a map of raw scores to [0, 1] */
function normalise(scores: Map<string, number>): Map<string, number> {
  const max = Math.max(1, ...scores.values());
  const result = new Map<string, number>();
  for (const [k, v] of scores) result.set(k, v / max);
  return result;
}

/** Apply loyalty bonus to entities played frequently */
function applyLoyalty(
  scores: Map<string, number>,
  counts: Map<string, number>
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [k, score] of scores) {
    const count = counts.get(k) ?? 0;
    const bonus = count > LOYALTY_BONUS_THRESHOLD ? LOYALTY_BONUS_MULTIPLIER : 1;
    result.set(k, Math.min(1, score * bonus));
  }
  return result;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  try {
    // 1. Fetch all plays
    const { data: plays, error: playsErr } = await supabase
      .from('plays')
      .select('played_at, artist, title, track_id')
      .order('played_at', { ascending: false });

    if (playsErr) throw playsErr;
    if (!plays?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No plays yet' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch all tracks with tags
    const { data: tracks, error: tracksErr } = await supabase
      .from('tracks')
      .select('id, title, artist, genre_tags')
      .not('genre_tags', 'is', null);

    if (tracksErr) throw tracksErr;

    const trackMap = new Map<string, TrackRow>();
    for (const t of (tracks ?? [])) trackMap.set(t.id, t);

    // 3. Accumulate weighted scores + raw counts
    const artistScores = new Map<string, number>();
    const artistCounts = new Map<string, number>();
    const trackScores  = new Map<string, number>();
    const trackCounts  = new Map<string, number>();
    const genreScores  = new Map<string, number>();
    const genreCounts  = new Map<string, number>();

    // Listening time persona buckets (hour in IST)
    const hourBuckets: Record<string, number> = {
      morning:   0, // 05–11
      afternoon: 0, // 12–17
      evening:   0, // 18–21
      night:     0, // 22–04
    };

    for (const play of plays as PlayRow[]) {
      const w = recencyWeight(play.played_at);
      const artist = play.artist;
      const trackKey = `${artist}__${play.title}`.toLowerCase();

      // Artist scores
      artistScores.set(artist, (artistScores.get(artist) ?? 0) + w);
      artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);

      // Track scores
      trackScores.set(trackKey, (trackScores.get(trackKey) ?? 0) + w);
      trackCounts.set(trackKey, (trackCounts.get(trackKey) ?? 0) + 1);

      // Genre scores — via track map lookup
      if (play.track_id) {
        const track = trackMap.get(play.track_id);
        if (track?.genre_tags?.length) {
          for (const genre of track.genre_tags) {
            genreScores.set(genre, (genreScores.get(genre) ?? 0) + w);
            genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
          }
        }
      }

      // Listening time persona (convert UTC → IST = UTC+5:30)
      const istHour = (new Date(play.played_at).getUTCHours() + 5 + Math.floor(30 / 60)) % 24;
      const effectiveHour = istHour + (new Date(play.played_at).getUTCMinutes() >= 30 ? 1 : 0);
      if (effectiveHour >= 5  && effectiveHour < 12) hourBuckets.morning++;
      else if (effectiveHour >= 12 && effectiveHour < 18) hourBuckets.afternoon++;
      else if (effectiveHour >= 18 && effectiveHour < 22) hourBuckets.evening++;
      else hourBuckets.night++;
    }

    // 4. Normalise + apply loyalty bonus
    const normArtist = applyLoyalty(normalise(artistScores), artistCounts);
    const normTrack  = applyLoyalty(normalise(trackScores),  trackCounts);
    const normGenre  = applyLoyalty(normalise(genreScores),  genreCounts);

    // 5. Determine listening persona
    const topPersonaBucket = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0][0];

    // 6. Build upsert rows for taste_profile
    const now = new Date().toISOString();
    const rows: object[] = [];

    for (const [entity_name, affinity_score] of normArtist) {
      rows.push({
        entity_type: 'artist',
        entity_name,
        play_count: artistCounts.get(entity_name) ?? 0,
        affinity_score: Math.round(affinity_score * 10000) / 10000,
        last_played_at: plays.find((p: PlayRow) => p.artist === entity_name)?.played_at ?? null,
        updated_at: now,
      });
    }

    for (const [entity_name, affinity_score] of normTrack) {
      rows.push({
        entity_type: 'track',
        entity_name,
        play_count: trackCounts.get(entity_name) ?? 0,
        affinity_score: Math.round(affinity_score * 10000) / 10000,
        last_played_at: null,
        updated_at: now,
      });
    }

    for (const [entity_name, affinity_score] of normGenre) {
      rows.push({
        entity_type: 'genre',
        entity_name,
        play_count: genreCounts.get(entity_name) ?? 0,
        affinity_score: Math.round(affinity_score * 10000) / 10000,
        last_played_at: null,
        updated_at: now,
      });
    }

    // Add listening persona as a special 'meta' dimension
    rows.push({
      entity_type: 'genre', // reuse genre slot; value is prefixed
      entity_name: `__persona__${topPersonaBucket}`,
      play_count: hourBuckets[topPersonaBucket],
      affinity_score: 1.0,
      last_played_at: null,
      updated_at: now,
    });

    // 7. Clear stale profile and rewrite
    await supabase.from('taste_profile').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Batch insert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error: insertErr } = await supabase
        .from('taste_profile')
        .insert(rows.slice(i, i + CHUNK));
      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        artists: normArtist.size,
        tracks: normTrack.size,
        genres: normGenre.size,
        persona: topPersonaBucket,
        total_rows: rows.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('build-taste-profile error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
