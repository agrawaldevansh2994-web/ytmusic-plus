import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Period = 'week' | 'month' | 'all'

export interface TopTrack {
  name: string
  artist: string
  play_count: number
  image_url?: string
  genre_tags?: string[]
}

export interface TopArtist {
  artist: string
  play_count: number
}

export interface TopAlbum {
  album: string
  artist: string
  play_count: number
  image_url?: string
}

export interface GenreEntry {
  genre: string
  play_count: number
}

export interface WeeklyScrobble {
  day: string
  play_count: number
}

export interface HeatmapCell {
  hour: number
  dow: number
  play_count: number
}

export interface Summary {
  total_plays: number
  unique_artists: number
  top_genre: string
  total_duration_seconds: number
}

export interface RecentPlay {
  title: string
  artist: string
  album: string | null
  played_at: string
  image_url: string | null
  youtube_video_id: string | null
  genre_tags?: string[]
}

export interface YoutubeMatchStats {
  resolved: number
  total: number
}

export interface Stats {
  summary: Summary
  topTracks: TopTrack[]
  topArtists: TopArtist[]
  topAlbums: TopAlbum[]
  genreDistribution: GenreEntry[]
  weeklyScrobbles: WeeklyScrobble[]
  heatmap: HeatmapCell[]
  recentPlays: RecentPlay[]
  youtubeMatch: YoutubeMatchStats
  lastSyncTimestamp: number | null
}

export function useStats(period: Period) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Bump the tick to re-run the loader (used after a manual sync).
  const refetch = useCallback(() => setRefreshTick((t) => t + 1), [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const [
          { data: summaryRows,  error: e0 },
          { data: topTracks,    error: e1 },
          { data: topArtists,   error: e2 },
          { data: genreDist,    error: e3 },
          { data: heatmap,      error: e4 },
          { data: syncData,     error: e5 },
          { data: recentPlays,  error: e6 },
          { data: ytMatchRows,  error: e7 },
          { data: topAlbums,    error: e8 },
          { data: weeklyRows,   error: e9 },
        ] = await Promise.all([
          supabase.rpc('get_summary',              { period }),
          supabase.rpc('get_top_tracks',            { period, lim: 10 }),
          supabase.rpc('get_top_artists',           { period, lim: 10 }),
          supabase.rpc('get_genre_distribution',    { period, lim: 10 }),
          supabase.rpc('get_listening_heatmap',     { period }),
          supabase.from('sync_state').select('value').eq('key', 'lastfm_last_synced_at').maybeSingle(),
          supabase.rpc('get_recent_plays',          { lim: 8 }),
          supabase.rpc('get_youtube_match_stats'),
          supabase.rpc('get_top_albums',            { period, lim: 10 }),
          supabase.rpc('get_weekly_scrobbles',      { days: 7 }),
        ])

        const firstErr = e0 ?? e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6 ?? e7 ?? e8 ?? e9
        if (firstErr) throw firstErr

        const summary: Summary = summaryRows?.[0] ?? {
          total_plays: 0,
          unique_artists: 0,
          top_genre: '—',
          total_duration_seconds: 0,
        }

        const youtubeMatch: YoutubeMatchStats = ytMatchRows?.[0] ?? { resolved: 0, total: 0 }

        setStats({
          summary,
          topTracks:         (topTracks   as TopTrack[])   ?? [],
          topArtists:        (topArtists  as TopArtist[])  ?? [],
          topAlbums:         (topAlbums   as TopAlbum[])   ?? [],
          genreDistribution: (genreDist   as GenreEntry[]) ?? [],
          weeklyScrobbles:   (weeklyRows  as WeeklyScrobble[]) ?? [],
          heatmap:           (heatmap     as HeatmapCell[]) ?? [],
          recentPlays:       (recentPlays as RecentPlay[]) ?? [],
          youtubeMatch,
          lastSyncTimestamp: syncData?.value ? parseInt(syncData.value) : null,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [period, refreshTick])

  return { stats, loading, error, refetch }
}
