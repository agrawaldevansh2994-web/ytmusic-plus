import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface PlaylistTrack {
  title: string
  artist: string
  tier?: 'high' | 'mid' | 'low'
  affinity_score?: number
  youtube_video_id?: string
}

export interface Playlist {
  id: string
  source: 'auto_monthly' | 'manual'
  title: string
  youtube_playlist_id: string | null
  youtube_playlist_url: string | null
  requested_size: number | null
  target_genre: string | null
  track_count: number
  tracks: PlaylistTrack[]
  created_at: string
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setPlaylists((data as Playlist[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { playlists, loading, error, refresh: load }
}
