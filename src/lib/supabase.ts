import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env and fill in your project credentials.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types (mirror your DB schema) ────────────────────────────────────────────

export interface Track {
  id: string
  video_id: string
  title: string // was: name
  artist: string
  album: string | null
  duration_seconds: number | null // was: duration_ms
  genre_tags: string[] // was: tags
  lastfm_url: string | null
  mbid: string | null
  created_at: string
  updated_at: string
}

export interface Play {
  id: string
  track_id: string | null // nullable
  video_id: string
  title: string // denormalized
  artist: string // denormalized
  album: string | null
  played_at: string
  duration_seconds: number | null
  source: string | null
  created_at: string
}
export interface TasteProfile {
  id: string
  dimension: string
  value: string
  score: number
  updated_at: string
}
