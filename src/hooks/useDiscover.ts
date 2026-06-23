import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface Recommendation {
  artist: string
  title: string
  image_url: string | null
  reason: string
  match: number
  tags: string[]
}

/**
 * Calls the `discover` Edge Function, which pulls genuinely NEW tracks (ones the
 * user has never scrobbled) from Last.fm based on their taste or a target genre.
 */
export function useDiscover() {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function discover(genre?: string, size = 24) {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { size }
      if (genre && genre !== 'all') body.genre = genre
      const { data, error: fnError } = await supabase.functions.invoke('discover', { body })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setRecs((data?.recommendations as Recommendation[]) ?? [])
      setGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  return { recs, loading, generated, error, discover }
}
