import { useState } from 'react'
import { useStats } from '../hooks/useStats'
import type { Period } from '../hooks/useStats'
import TopList from '../components/TopList'
import GenreChart from '../components/GenreChart'
import Heatmap from '../components/Heatmap'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'This week',  value: 'week'  },
  { label: 'This month', value: 'month' },
  { label: 'All time',   value: 'all'   },
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

  return (
    <div className="min-h-screen bg-zinc-950 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            YTMusic<span className="text-red-500">+</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">DevDevansh</p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-xl">
          <p className="text-red-400 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Scrobbles"
          value={stats?.summary.total_plays.toLocaleString() ?? '—'}
          loading={loading}
        />
        <StatCard
          label="Artists"
          value={stats?.summary.unique_artists.toLocaleString() ?? '—'}
          loading={loading}
        />
        <StatCard
          label="Top genre"
          value={stats?.summary.top_genre ?? '—'}
          loading={loading}
        />
      </div>

      {/* Top tracks + artists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <TopList title="Top tracks"  items={topTracksItems}  loading={loading} />
        <TopList title="Top artists" items={topArtistItems}  loading={loading} />
      </div>

      {/* Genre chart */}
      <div className="mb-4">
        <GenreChart data={stats?.genreDistribution ?? []} loading={loading} />
      </div>

      {/* Heatmap */}
      <Heatmap data={stats?.heatmap ?? []} loading={loading} />
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {loading ? (
        <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
      ) : (
        <p className="text-xl font-bold text-white truncate">{value}</p>
      )}
    </div>
  )
}
