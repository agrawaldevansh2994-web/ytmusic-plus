import { useState } from 'react'
import { useStats } from '../hooks/useStats'
import type { Period } from '../hooks/useStats'
import { useImageColor } from '../hooks/useImageColor'
import TopList from '../components/TopList'
import GenreChart from '../components/GenreChart'
import Heatmap from '../components/Heatmap'
import RecentPlays from '../components/RecentPlays'
import VibeRadar from '../components/VibeRadar'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'All',   value: 'all'   },
]

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('all')
  const { stats, loading, error } = useStats(period)
  const topTrackColor = useImageColor(stats?.topTracks?.[0]?.image_url)

  const topTracksItems = (stats?.topTracks ?? []).map((t) => ({
    name: t.name,
    subtitle: t.artist,
    play_count: t.play_count,
    image_url: t.image_url,
    genre_tags: t.genre_tags,
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

  const ytMatchPct = stats
    ? `${Math.round((stats.youtubeMatch.resolved / Math.max(1, stats.youtubeMatch.total)) * 100)}%`
    : '—'

  const colorStyle = topTrackColor
    ? {
        '--theme-color-rgb': `${topTrackColor.r}, ${topTrackColor.g}, ${topTrackColor.b}`,
        '--theme-color-light': `rgb(${Math.min(255, topTrackColor.r + 50)}, ${Math.min(255, topTrackColor.g + 50)}, ${Math.min(255, topTrackColor.b + 50)})`,
      } as React.CSSProperties
    : {
        '--theme-color-rgb': '239, 68, 68',
        '--theme-color-light': '#fb7185',
      } as React.CSSProperties

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-1000" style={colorStyle}>
      {/* ── Ambient Background Glows ──────────────────────────────── */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: 'rgba(var(--theme-color-rgb), 0.15)' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 delay-150"
        style={{ backgroundColor: 'rgba(var(--theme-color-rgb), 0.08)' }}
      />

      <div className="relative z-10 px-4 py-8 max-w-2xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-white">YTMusic</span>
              <span 
                className="bg-clip-text text-transparent transition-colors duration-1000"
                style={{ backgroundImage: 'linear-gradient(to right, rgb(var(--theme-color-rgb)), var(--theme-color-light))' }}
              >
                +
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center h-2 w-2">
                <span 
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'rgb(var(--theme-color-rgb))' }}
                ></span>
                <span 
                  className="relative inline-flex rounded-full h-1.5 w-1.5 shadow-[0_0_8px_rgba(var(--theme-color-rgb),0.8)]"
                  style={{ backgroundColor: 'rgb(var(--theme-color-rgb))' }}
                ></span>
              </div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
                DevDevansh <span className="mx-1 opacity-50">•</span> <span className="lowercase">{syncText}</span>
              </p>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex items-center p-1 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-xl">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ${
                  period === p.value
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
                style={period === p.value ? { textShadow: '0 0 10px rgba(var(--theme-color-rgb), 0.5)' } : undefined}
              >
                {period === p.value && (
                  <div 
                    className="absolute inset-0 rounded-xl -z-10 transition-colors duration-1000"
                    style={{ backgroundImage: 'linear-gradient(to right, rgb(var(--theme-color-rgb)), var(--theme-color-light))' }}
                  />
                )}
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Error banner ────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 backdrop-blur-md border border-red-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-red-500 text-lg">⚠</span>
            <p className="text-red-200 text-sm font-medium mt-0.5">{error}</p>
          </div>
        )}

        {/* ── Summary cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Scrobbles"   value={stats?.summary.total_plays.toLocaleString() ?? '—'} loading={loading} color="purple" />
          <StatCard label="Artists"     value={stats?.summary.unique_artists.toLocaleString() ?? '—'} loading={loading} color="green" />
          <StatCard label="Top genre"   value={stats?.summary.top_genre ?? '—'} loading={loading} color="blue" small />
          <StatCard label="YT Matched"  value={ytMatchPct} loading={loading} color="orange" />
        </div>

        {/* ── Hero section ────────────────────────────────────────── */}
        {!loading && stats?.topTracks && stats.topTracks.length > 0 && (
          <div className="mb-8">
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Top Track (This {period})</h3>
            <HeroCard item={stats.topTracks[0]} />
          </div>
        )}

        {/* ── Top tracks + artists ────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 overflow-hidden shadow-2xl">
            <TopList title="Top tracks"  items={topTracksItems}  loading={loading} />
          </div>
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 overflow-hidden shadow-2xl">
            <TopList title="Top artists" items={topArtistItems}  loading={loading} />
          </div>
        </div>

        {/* ── Advanced Visualizations ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
            <VibeRadar data={stats?.genreDistribution ?? []} loading={loading} />
          </div>
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
            <GenreChart data={stats?.genreDistribution ?? []} loading={loading} />
          </div>
        </div>

        {/* ── Heatmap ─────────────────────────────────────────────── */}
        <div className="mb-8 bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-4 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <Heatmap data={stats?.heatmap ?? []} loading={loading} />
        </div>

        {/* ── Recent plays ─────────────────────────────────────────── */}
        <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-4 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <RecentPlays items={stats?.recentPlays ?? []} loading={loading} />
        </div>

        <p className="text-center text-[11px] font-medium text-zinc-600 mt-10 mb-4 tracking-wider uppercase">
          Powered by Last.fm <span className="mx-2 text-zinc-800">|</span> Supabase
        </p>
      </div>
    </div>
  )
}

/* ── HeroCard ────────────────────────────────────────────────────────────── */
function HeroCard({ item }: { item: any }) {
  if (!item) return null;
  return (
    <div className="relative overflow-hidden rounded-3xl h-64 group cursor-pointer shadow-2xl transition-transform duration-500 hover:-translate-y-1 hover:shadow-3xl">
      {item.image_url ? (
        <img
          src={item.image_url.replace('300x300', '600x600')}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex items-end justify-between">
        <div className="min-w-0 flex-1 pr-4">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 block drop-shadow-md">
            #1 Track
          </span>
          <h2 className="text-3xl font-black text-white truncate drop-shadow-lg leading-tight mb-1">
            {item.name}
          </h2>
          <p className="text-sm font-medium text-zinc-300 truncate drop-shadow-md">
            {item.artist}
          </p>
        </div>
        
        <div className="shrink-0 flex flex-col items-end">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Plays</span>
          <span className="text-3xl font-black text-white drop-shadow-lg leading-none">
            {item.play_count}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── StatCard ────────────────────────────────────────────────────────────── */
const COLOR_MAP: Record<string, { bg: string, text: string }> = {
  purple: { bg: 'bg-purple-900/30 border-purple-800/40 hover:bg-purple-900/50 hover:border-purple-700', text: 'text-purple-300' },
  green: { bg: 'bg-emerald-900/30 border-emerald-800/40 hover:bg-emerald-900/50 hover:border-emerald-700', text: 'text-emerald-300' },
  blue: { bg: 'bg-blue-900/30 border-blue-800/40 hover:bg-blue-900/50 hover:border-blue-700', text: 'text-blue-300' },
  orange: { bg: 'bg-orange-900/30 border-orange-800/40 hover:bg-orange-900/50 hover:border-orange-700', text: 'text-orange-300' },
  red: { bg: 'bg-red-900/30 border-red-800/40 hover:bg-red-900/50 hover:border-red-700', text: 'text-red-300' },
  default: { bg: 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60 hover:border-zinc-700', text: 'text-white' }
}

function StatCard({
  label,
  value,
  loading,
  color = 'default',
  small = false,
}: {
  label: string
  value: string
  loading: boolean
  color?: string
  small?: boolean
}) {
  const theme = COLOR_MAP[color] || COLOR_MAP['default']
  
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl p-5 border backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme.bg}`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 z-10 relative">
        {label}
      </p>
      
      {loading ? (
        <div className="h-8 w-20 bg-zinc-800/50 rounded-xl animate-pulse z-10 relative" />
      ) : (
        <p
          className={`font-black tracking-tight leading-none truncate z-10 relative drop-shadow-sm transition-transform duration-500 group-hover:scale-105 origin-left ${
            small ? 'text-lg mt-1' : 'text-3xl tabular-nums'
          } ${theme.text}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}
