import { useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import type { Playlist, PlaylistTrack } from '../hooks/usePlaylists'

const TIER_EMOJI: Record<string, string> = {
  high: '🔥',
  mid: '⭐',
  low: '🎲',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Playlists() {
  const { playlists, loading, error } = usePlaylists()
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight leading-none">
          YTMusic<span className="text-red-500">+</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Playlists</p>
      </header>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3">
          <span className="text-red-500 text-lg">⚠</span>
          <p className="text-red-200 text-sm font-medium mt-0.5">{error}</p>
        </div>
      )}

      {/* ── Loading skeleton ──────────────────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[68px] bg-zinc-900/50 rounded-2xl animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!loading && playlists.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-zinc-400 text-sm font-medium">No playlists yet</p>
          <p className="text-zinc-600 text-xs mt-1">Push a Smart Shuffle to YouTube to see it here</p>
        </div>
      )}

      {/* ── Playlist list ─────────────────────────────────────────── */}
      {!loading && playlists.length > 0 && (
        <ul className="space-y-3">
          {playlists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              expanded={openId === pl.id}
              onToggle={() => setOpenId(openId === pl.id ? null : pl.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── PlaylistCard ────────────────────────────────────────────────────────── */
function PlaylistCard({
  playlist,
  expanded,
  onToggle,
}: {
  playlist: Playlist
  expanded: boolean
  onToggle: () => void
}) {
  const isAuto = playlist.source === 'auto_monthly'

  return (
    <li className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <span
          className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${
            isAuto ? 'bg-indigo-500/15 text-indigo-400' : 'bg-red-500/15 text-red-400'
          }`}
        >
          {isAuto ? '🗓️ Auto' : '✨ Manual'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate leading-tight">{playlist.title}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {formatDate(playlist.created_at)} · {playlist.track_count} tracks
            {playlist.target_genre ? ` · ${playlist.target_genre}` : ''}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 py-3 space-y-2">
          {playlist.youtube_playlist_url && (
            <a
              href={playlist.youtube_playlist_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 mb-2 rounded-xl text-xs font-bold
                bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-zinc-700"
            >
              Open in YouTube Music ↗
            </a>
          )}
          <ul className="space-y-1 max-h-72 overflow-y-auto">
            {playlist.tracks.map((track, i) => (
              <TrackLine key={i} track={track} index={i} />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

/* ── TrackLine ───────────────────────────────────────────────────────────── */
function TrackLine({ track, index }: { track: PlaylistTrack; index: number }) {
  const hasVideo = track.youtube_video_id && track.youtube_video_id !== '__not_found__'

  const content = (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
      <span className="text-[10px] text-zinc-600 w-4 text-right shrink-0 tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-200 truncate leading-tight">{track.title}</p>
        <p className="text-[11px] text-zinc-500 truncate">{track.artist}</p>
      </div>
      {track.tier && <span className="text-xs shrink-0">{TIER_EMOJI[track.tier]}</span>}
    </div>
  )

  return (
    <li>
      {hasVideo ? (
        <a
          href={`https://music.youtube.com/watch?v=${track.youtube_video_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </li>
  )
}
