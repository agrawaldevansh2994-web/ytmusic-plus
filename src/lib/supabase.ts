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
  mbid: string | null
  name: string
  artist: string
  album: string | null
  duration_ms: number | null
  tags: string[]
  created_at: string
}

export interface Play {
  id: string
  track_id: string
  played_at: string
  source: string
  loved: boolean
  created_at: string
}

export interface TasteProfile {
  id: string
  dimension: string
  value: string
  score: number
  updated_at: string
}
