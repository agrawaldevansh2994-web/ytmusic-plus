import type { Recommendation } from '../hooks/useDiscover'

interface DiscoverViewProps {
  recs: Recommendation[]
  loading: boolean
  generated: boolean
  error: string | null
}

function ytSearch(artist: string, title: string): string {
  return `https://music.youtube.com/search?q=${encodeURIComponent(`${artist} ${title}`)}`
}

export default function DiscoverView({ recs, loading, generated, error }: DiscoverViewProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3">
        <span className="text-red-500 text-lg">⚠</span>
        <p className="text-red-200 text-sm font-medium mt-0.5">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-56 skeleton rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-2xl" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    )
  }

  if (!generated) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🛰️</p>
        <p className="text-zinc-300 text-sm font-semibold">Discover music you've never heard</p>
        <p className="text-zinc-600 text-xs mt-1 max-w-xs mx-auto">
          Fresh tracks pulled from artists &amp; songs similar to your taste — nothing already in your library.
        </p>
      </div>
    )
  }

  if (recs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">🤷</p>
        <p className="text-zinc-400 text-sm font-medium">No fresh picks right now</p>
        <p className="text-zinc-600 text-xs mt-1">Try a different vibe, or scrobble more to sharpen your taste.</p>
      </div>
    )
  }

  const [hero, ...rest] = recs

  return (
    <div className="space-y-4">
      <HeroRec rec={hero} />
      <div className="grid grid-cols-2 gap-3">
        {rest.map((rec, i) => (
          <RecCard key={`${rec.artist}-${rec.title}-${i}`} rec={rec} index={i} />
        ))}
      </div>
    </div>
  )
}

/* ── Hero recommendation ──────────────────────────────────────────────────── */
function HeroRec({ rec }: { rec: Recommendation }) {
  return (
    <a
      href={ytSearch(rec.artist, rec.title)}
      target="_blank"
      rel="noopener noreferrer"
      className="shine group relative block overflow-hidden rounded-3xl h-56 shadow-2xl animate-row-in"
    >
      {/* Blurred art backdrop for ambient color */}
      {rec.image_url ? (
        <img src={rec.image_url} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-purple-900/40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />

      <div className="relative h-full flex items-center gap-4 p-5">
        {/* Sharp cover */}
        <div className="relative shrink-0 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
          {rec.image_url ? (
            <img src={rec.image_url} alt={rec.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl text-zinc-600">♪</div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/90 shadow-xl">
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            New for you
          </span>
          <h2 className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg">{rec.title}</h2>
          <p className="text-sm font-medium text-zinc-300 truncate mt-1">{rec.artist}</p>
          <p className="text-[11px] text-zinc-400 mt-2 truncate italic">{rec.reason}</p>
        </div>
      </div>
    </a>
  )
}

/* ── Recommendation cover tile ────────────────────────────────────────────── */
function RecCard({ rec, index }: { rec: Recommendation; index: number }) {
  return (
    <a
      href={ytSearch(rec.artist, rec.title)}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-square rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/5 animate-row-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {rec.image_url ? (
        <img
          src={rec.image_url}
          alt={rec.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-3xl text-zinc-700">♪</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Reason chip */}
      <span className="absolute top-2 left-2 right-2 text-[9px] font-semibold text-white/90 bg-black/45 backdrop-blur-sm px-2 py-1 rounded-full truncate">
        {rec.reason}
      </span>

      {/* Play affordance */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-full bg-red-500/90 shadow-xl scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </span>

      {/* Title / artist */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-[13px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md">{rec.title}</p>
        <p className="text-[11px] text-zinc-300 truncate mt-0.5">{rec.artist}</p>
      </div>
    </a>
  )
}
