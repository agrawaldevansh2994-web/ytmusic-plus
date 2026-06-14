import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Play, Track } from '../lib/supabase'

type PlayWithTrack = Play & { tracks: Track }

export default function Dashboard() {
  const [recentPlays, setRecentPlays] = useState<PlayWithTrack[]>([])
  const [totalPlays, setTotalPlays] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { count } = await supabase
          .from('plays')
          .select('*', { count: 'exact', head: true })

        setTotalPlays(count)

        const { data, error: fetchErr } = await supabase
          .from('plays')
          .select('*, tracks(*)')
          .order('played_at', { ascending: false })
          .limit(10)

        if (fetchErr) throw fetchErr
        setRecentPlays((data as PlayWithTrack[]) ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          YTMusic<span className="text-red-500">+</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Your personal listening dashboard</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Total scrobbles"
          value={totalPlays !== null ? totalPlays.toLocaleString() : '—'}
          loading={loading}
        />
        <StatCard label="Last.fm user" value="DevDevansh" loading={false} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Recent plays
        </h2>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-sm">Failed to load: {error}</p>}

        {!loading && !error && recentPlays.length === 0 && (
          <p className="text-zinc-500 text-sm">
            No plays yet — make sure the Last.fm sync is running.
          </p>
        )}

        {!loading && !error && (
          <ul className="space-y-2">
            {recentPlays.map((play) => (
              <li
                key={play.id}
                className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{play.tracks.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{play.tracks.artist}</p>
                </div>
                <time className="text-xs text-zinc-500 shrink-0">
                  {new Date(play.played_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                {play.loved && <span className="text-red-400 text-xs">♥</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
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
        <p className="text-xl font-bold text-white">{value}</p>
      )}
    </div>
  )
}
