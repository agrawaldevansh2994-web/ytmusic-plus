import { useState } from 'react'
import { useShuffle, useTasteSummary } from '../hooks/useShuffle'
import type { ShuffleTrack } from '../hooks/useShuffle'

const PERSONA_META: Record<string, { emoji: string; label: string; color: string }> = {
  morning:   { emoji: '🌅', label: 'Morning listener',   color: 'from-amber-900/30 to-transparent' },
  afternoon: { emoji: '☀️', label: 'Afternoon listener', color: 'from-yellow-900/30 to-transparent' },
  evening:   { emoji: '🌆', label: 'Evening listener',   color: 'from-orange-900/30 to-transparent' },
  night:     { emoji: '🌙', label: 'Night owl',          color: 'from-indigo-900/30 to-transparent' },
}

const TIER_META: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  high: { emoji: '🔥', label: 'Favourite',  bg: 'bg-red-500/15',    text: 'text-red-400'   },
  mid:  { emoji: '⭐', label: 'Liked',      bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  low:  { emoji: '🎲', label: 'Discovery',  bg: 'bg-zinc-700/40',   text: 'text-zinc-400'  },
}

export default function Shuffle() {
  const { summary, loading: summaryLoading } = useTasteSummary()
  const { playlist, loading, generated, generate } = useShuffle()
  const [size, setSize] = useState(25)

  const persona = PERSONA_META[summary?.persona ?? 'evening']

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight leading-none">
          YTMusic<span className="text-red-500">+</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Smart Shuffle</p>
      </header>

      {!summaryLoading && summary && (
        <div className={`rounded-2xl p-5 mb-5 border border-zinc-800/50 bg-gradient-to-br ${persona.color} bg-zinc-900/60`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{persona.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">{persona.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Based on your listening history</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {summary.topGenres.slice(0, 4).map((g) => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 w-20 shrink-0 capitalize truncate">{g.name}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${g.score * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-600 w-7 text-right tabular-nums">{Math.round(g.score * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {[15, 25, 40].map((n) => (
            <button key={n} onClick={() => setSize(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                size === n ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => generate(size)} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
            bg-red-500 hover:bg-red-400 active:scale-95 text-white transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/20">
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
          ) : (
            <><span>{generated ? '🔄' : '✨'}</span>{generated ? 'Regenerate' : 'Generate Playlist'}</>
          )}
        </button>
      </div>

      {generated && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(TIER_META).map(([tier, meta]) => (
            <span key={tier} className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${meta.bg} ${meta.text}`}>
              {meta.emoji} {meta.label}
            </span>
          ))}
          <span className="text-[11px] text-zinc-600 self-center ml-auto">{playlist.length} tracks</span>
        </div>
      )}

      {!generated && !loading && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎧</p>
          <p className="text-zinc-400 text-sm font-medium">Your taste, intelligently shuffled</p>
          <p className="text-zinc-600 text-xs mt-1">Picks from your favourites with a dash of discovery</p>
        </div>
      )}

      {generated && !loading && (
        <ul className="space-y-1.5">
          {playlist.map((track, i) => <TrackRow key={i} track={track} index={i} />)}
        </ul>
      )}
    </div>
  )
}

function TrackRow({ track, index }: { track: ShuffleTrack; index: number }) {
  const tier = TIER_META[track.tier]
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/40
      hover:border-zinc-700/60 transition-all duration-150">
      <span className="text-[11px] text-zinc-600 w-5 text-right shrink-0 tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate leading-tight">{track.title}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
        {track.genre_tags?.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {track.genre_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 capitalize">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tier.bg} ${tier.text}`} title={tier.label}>
        {tier.emoji}
      </span>
      <div className="shrink-0 w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${track.affinity_score * 100}%` }} />
      </div>
    </li>
  )
}
