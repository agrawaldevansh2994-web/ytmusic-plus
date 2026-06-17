import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface ShuffleTrack {
  title: string
  artist: string
  genre_tags: string[]
  affinity_score: number
  tier: 'high' | 'mid' | 'low'
  youtube_video_id?: string
}

export interface TasteSummary {
  persona: string       // e.g. 'evening'
  topGenres: { name: string; score: number }[]
}

export function useTasteSummary() {
  const [summary, setSummary] = useState<TasteSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('get_taste_summary')
      if (!data) { setLoading(false); return }

      const persona = (data as any[])
        .find((r: any) => r.entity_name?.startsWith('__persona__'))
        ?.entity_name?.replace('__persona__', '') ?? 'evening'

      const topGenres = (data as any[])
        .filter((r: any) => r.entity_type === 'genre' && !r.entity_name.startsWith('__persona__'))
        .slice(0, 5)
        .map((r: any) => ({ name: r.entity_name as string, score: r.affinity_score as number }))

      setSummary({ persona, topGenres })
      setLoading(false)
    }
    load()
  }, [])

  return { summary, loading }
}

export function useShuffle() {
  const [playlist, setPlaylist] = useState<ShuffleTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generate(size = 25) {
    setLoading(true)
    const { data, error } = await supabase.rpc('generate_smart_shuffle', { playlist_size: size })
    if (!error && data) {
      setPlaylist(data as ShuffleTrack[])
      setGenerated(true)
    }
    setLoading(false)
    return (data as ShuffleTrack[]) || []
  }

  return { playlist, loading, generated, generate }
}
