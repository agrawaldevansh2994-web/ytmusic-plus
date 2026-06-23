import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStats } from '../hooks/useStats'
import type { Period } from '../hooks/useStats'
import { useImageColor } from '../hooks/useImageColor'
import { useCountUp } from '../hooks/useCountUp'
import Reveal from '../components/Reveal'
import TopList from '../components/TopList'
import GenreChart from '../components/GenreChart'
import WeeklyChart from '../components/WeeklyChart'
import Heatmap from '../components/Heatmap'
import RecentPlays from '../components/RecentPlays'
import VibeRadar from '../components/VibeRadar'

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'All',   value: 'all'   },
]

// Quick moods for 1-Click Vibes — ids must match the VIBES list in Shuffle.tsx
const MOODS: { id: string; label: string; emoji: string }[] = [
  { id: 'techno',  label: 'Techno',  emoji: '🔊' },
  { id: 'schranz', label: 'Schranz', emoji: '⚡' },
  { id: 'house',   label: 'House',   emoji: '🏠' },
  { id: 'trance',  label: 'Trance',  emoji: '🌀' },
  { id: 'rnb',     label: 'R&B',     emoji: '💜' },
  { id: 'hip-hop', label: 'Hip-Hop', emoji: '🎤' },
  { id: 'pop',     label: 'Pop',     emoji: '✨' },
  { id: 'indie',   label: 'Indie',   emoji: '🎸' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('all')
  const [showVibes, setShowVibes] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const { stats, loading, error, refetch } = useStats(period)

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncMsg(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sync-lastfm')
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      const added = data?.inserted ?? 0
      setSyncMsg(added > 0 ? `✓ ${added} new ${added === 1 ? 'play' : 'plays'} synced` : '✓ Up to date')
      refetch()
    } catch (err) {
      setSyncMsg(`✗ ${err instanceof Error ? err.message : 'Sync failed'}`)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }
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

  const topAlbumItems = (stats?.topAlbums ?? []).map((a) => ({
    name: a.album,
    subtitle: a.artist,
    play_count: a.play_count,
    image_url: a.image_url,
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

  const fmtDuration = (s?: number) => {
    if (!s || s <= 0) return '—'
    const totalH = Math.floor(s / 3600)
    if (totalH >= 24) return `${Math.floor(totalH / 24)}d ${totalH % 24}h`
    if (totalH >= 1) return `${totalH}h ${Math.floor((s % 3600) / 60)}m`
    return `${Math.max(1, Math.floor(s / 60))}m`
  }

  const avgPerArtist =
    stats && stats.summary.unique_artists > 0
      ? (stats.summary.total_plays / stats.summary.unique_artists).toFixed(1)
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
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden transition-colors duration-1000" style={colorStyle}>
      {/* ── Ambient Background Glows ──────────────────────────────── */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 animate-float-slow"
        style={{ backgroundColor: 'rgba(var(--theme-color-rgb), 0.15)' }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 delay-150 animate-float-slow"
        style={{ backgroundColor: 'rgba(var(--theme-color-rgb), 0.08)', animationDelay: '-7s' }}
      />

      <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 max-w-2xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
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
              <button
                onClick={handleSync}
                disabled={syncing}
                title="Pull latest scrobbles from Last.fm"
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/60 text-zinc-400 hover:text-white hover:border-zinc-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
              >
                <svg
                  className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {syncing ? 'Syncing' : 'Sync'}
                </span>
              </button>
            </div>
            {syncMsg && (
              <p className={`text-[11px] font-medium mt-0.5 ${syncMsg.startsWith('✗') ? 'text-red-400' : 'text-emerald-400'}`}>
                {syncMsg}
              </p>
            )}
          </div>

          {/* Period selector */}
          <div className="flex items-center p-1 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-xl">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ${
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <StatCard label="Scrobbles"      count={stats?.summary.total_plays}     loading={loading} color="purple" />
          <StatCard label="Artists"        count={stats?.summary.unique_artists}  loading={loading} color="green" />
          <StatCard label="Listening time" value={fmtDuration(stats?.summary.total_duration_seconds)} loading={loading} color="pink" small />
          <StatCard label="Plays / artist" value={avgPerArtist}                   loading={loading} color="cyan" />
          <StatCard label="Top genre"      value={stats?.summary.top_genre ?? '—'} loading={loading} color="blue" small />
          <StatCard label="YT Matched"     value={ytMatchPct}                     loading={loading} color="orange" />
        </div>

        {/* ── Quick Actions ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
          <Link to="/shuffle" className="group relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-4 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all duration-300 flex items-center gap-4 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-red-900/20 z-10">
              <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div className="z-10">
              <h3 className="font-bold text-white text-lg leading-tight group-hover:text-red-400 transition-colors">Play My Mix</h3>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mt-1">Smart Shuffle</p>
            </div>
          </Link>

          <button onClick={() => setShowVibes((v) => !v)} aria-expanded={showVibes} className="group relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-zinc-800/50 p-4 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all duration-300 flex items-center gap-4 text-left shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-purple-900/20 z-10">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="z-10">
              <h3 className="font-bold text-white text-lg leading-tight group-hover:text-purple-400 transition-colors">1-Click Vibes</h3>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold mt-1">Generate by Mood</p>
            </div>
          </button>
        </div>

        {/* ── 1-Click Vibes mood picker ────────────────────────────── */}
        {showVibes && (
          <div className="-mt-4 mb-8 p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Pick a mood — we'll shuffle it</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/shuffle?vibe=${m.id}&auto=1`)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 hover:bg-purple-600 hover:border-purple-500 hover:text-white transition-all duration-200 active:scale-95"
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Hero section ────────────────────────────────────────── */}
        {!loading && stats?.topTracks && stats.topTracks.length > 0 && (
          <Reveal className="block mb-8">
            <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Top Track (This {period})</h3>
            <HeroCard item={stats.topTracks[0]} />
          </Reveal>
        )}

        {/* ── Top tracks + artists ────────────────────────────────── */}
        <Reveal className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 overflow-hidden shadow-2xl">
            <TopList title="Top tracks"  items={topTracksItems}  loading={loading} />
          </div>
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 overflow-hidden shadow-2xl">
            <TopList title="Top artists" items={topArtistItems}  loading={loading} />
          </div>
        </Reveal>

        {/* ── Top albums ──────────────────────────────────────────── */}
        <Reveal className="block mb-8">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 overflow-hidden shadow-2xl">
            <TopList title="Top albums" items={topAlbumItems} loading={loading} />
          </div>
        </Reveal>

        {/* ── Advanced Visualizations ─────────────────────────────── */}
        <Reveal className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
            <VibeRadar data={stats?.genreDistribution ?? []} loading={loading} />
          </div>
          <div className="bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
            <GenreChart data={stats?.genreDistribution ?? []} loading={loading} />
          </div>
        </Reveal>

        {/* ── Weekly scrobble trend ───────────────────────────────── */}
        <Reveal className="block mb-8 bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-1 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <WeeklyChart data={stats?.weeklyScrobbles ?? []} loading={loading} />
        </Reveal>

        {/* ── Heatmap ─────────────────────────────────────────────── */}
        <Reveal className="block mb-8 bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-4 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <Heatmap data={stats?.heatmap ?? []} loading={loading} />
        </Reveal>

        {/* ── Recent plays ─────────────────────────────────────────── */}
        <Reveal className="block bg-zinc-900/30 backdrop-blur-lg border border-zinc-800/40 rounded-3xl p-4 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <RecentPlays items={stats?.recentPlays ?? []} loading={loading} />
        </Reveal>

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

  const playOnYouTube = () => {
    const query = encodeURIComponent(`${item.artist} ${item.name}`)
    window.open(`https://music.youtube.com/search?q=${query}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      onClick={playOnYouTube}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playOnYouTube() } }}
      className="shine relative overflow-hidden rounded-3xl h-64 group cursor-pointer shadow-2xl transition-transform duration-500 hover:-translate-y-1 hover:shadow-3xl"
    >
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

      {/* Play affordance on hover */}
      <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <span className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500/90 shadow-2xl shadow-red-900/40 scale-90 group-hover:scale-100 transition-transform duration-300">
          <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </div>

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
  pink: { bg: 'bg-pink-900/30 border-pink-800/40 hover:bg-pink-900/50 hover:border-pink-700', text: 'text-pink-300' },
  cyan: { bg: 'bg-cyan-900/30 border-cyan-800/40 hover:bg-cyan-900/50 hover:border-cyan-700', text: 'text-cyan-300' },
  red: { bg: 'bg-red-900/30 border-red-800/40 hover:bg-red-900/50 hover:border-red-700', text: 'text-red-300' },
  default: { bg: 'bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60 hover:border-zinc-700', text: 'text-white' }
}

/** Renders a count-up animated, locale-formatted integer. */
function AnimatedNumber({ value }: { value: number }) {
  const n = useCountUp(value)
  return <>{Math.round(n).toLocaleString()}</>
}

function StatCard({
  label,
  value,
  count,
  loading,
  color = 'default',
  small = false,
}: {
  label: string
  value?: string
  count?: number
  loading: boolean
  color?: string
  small?: boolean
}) {
  const theme = COLOR_MAP[color] || COLOR_MAP['default']

  return (
    <div
      className={`shine group relative overflow-hidden rounded-3xl p-4 sm:p-5 border backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme.bg}`}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2 z-10 relative">
        {label}
      </p>

      {loading ? (
        <div className="h-8 w-20 skeleton rounded-xl z-10 relative" />
      ) : (
        <p
          className={`font-black tracking-tight leading-none truncate z-10 relative drop-shadow-sm transition-transform duration-500 group-hover:scale-105 origin-left ${
            small ? 'text-lg mt-1' : 'text-3xl tabular-nums'
          } ${theme.text}`}
        >
          {count !== undefined ? <AnimatedNumber value={count} /> : (value ?? '—')}
        </p>
      )}
    </div>
  )
}
