import { useState } from 'react'
import { useStats } from '../hooks/useStats'
import type { Period } from '../hooks/useStats'
import TopList from '../components/TopList'
import GenreChart from '../components/GenreChart'
import Heatmap from '../components/Heatmap'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'All',   value: 'all'   },
]

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('all')
  const { stats, loading, error } = useStats(period)

  const topTracksItems = (stats?.topTracks ?? []).map((t) => ({
    name: t.name,
    subtitle: t.artist,
    play_count: t.play_count,
  }))

  const topArtistItems = (stats?.topArtists ?? []).map((a) => ({
    name: a.artist,
    play_count: a.play_count,
  }))

  const formatTimeAgo = (ts: number) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const diffInSeconds = Math.floor((Date.now() - ts * 1000) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  }

  const syncText = stats?.lastSyncTimestamp ? `Last synced ${formatTimeAgo(stats.lastSyncTimestamp)}` : 'live'

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-none">
            YTMusic<span className="text-red-500">+</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            DevDevansh · {syncText}
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                period === p.value
                  ? 'bg-red-500 text-white shadow-sm shadow-red-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && (
        <div className="mb-5 p-3 bg-red-950/50 border border-red-900/50 rounded-xl">
          <p className="text-red-400 text-xs font-medium">⚠ {error}</p>
        </div>
      )}

      {/* ── Summary cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Scrobbles"  value={stats?.summary.total_plays.toLocaleString() ?? '—'} loading={loading} accent />
        <StatCard label="Artists"    value={stats?.summary.unique_artists.toLocaleString() ?? '—'} loading={loading} />
        <StatCard label="Top genre"  value={stats?.summary.top_genre ?? '—'} loading={loading} small />
      </div>

      {/* ── Top tracks + artists ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
        <TopList title="Top tracks"  items={topTracksItems}  loading={loading} />
        <TopList title="Top artists" items={topArtistItems}  loading={loading} />
      </div>

      {/* ── Genre chart ─────────────────────────────────────────── */}
      <div className="mb-4">
        <GenreChart data={stats?.genreDistribution ?? []} loading={loading} />
      </div>

      {/* ── Heatmap ─────────────────────────────────────────────── */}
      <Heatmap data={stats?.heatmap ?? []} loading={loading} />

      <p className="text-center text-[10px] text-zinc-700 mt-6">
        Syncs every 15 min via pg_cron · Powered by Last.fm + Supabase
      </p>
    </div>
  )
}

/* ── StatCard ────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  loading,
  accent = false,
  small = false,
}: {
  label: string
  value: string
  loading: boolean
  accent?: boolean
  small?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 border transition-colors ${
        accent
          ? 'bg-red-950/30 border-red-900/40'
          : 'bg-zinc-900/60 border-zinc-800/50'
      }`}
    >
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      {loading ? (
        <div className="h-6 w-14 bg-zinc-800 rounded-lg animate-pulse" />
      ) : (
        <p
          className={`font-bold text-white leading-tight truncate ${
            small ? 'text-sm' : 'text-2xl tabular-nums'
          } ${accent ? 'text-red-400' : ''}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}
