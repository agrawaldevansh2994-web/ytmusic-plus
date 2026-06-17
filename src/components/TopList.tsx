export interface TopItem {
  name: string
  subtitle?: string
  play_count: number
  image_url?: string
}

interface TopListProps {
  title: string
  items: TopItem[]
  loading: boolean
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function TopList({ title, items, loading }: TopListProps) {
  const max = Math.max(1, items[0]?.play_count ?? 1)

  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        {title}
      </h3>

      {loading && (
        <div className="space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-11 bg-zinc-800/50 rounded-xl animate-pulse"
              style={{ opacity: 1 - i * 0.1 }}
            />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-zinc-600 text-sm py-4 text-center">No data yet</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="relative group rounded-xl overflow-hidden">
              {/* Progress bar background */}
              <div
                className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
                style={{
                  width: `${(item.play_count / max) * 100}%`,
                  background:
                    i === 0
                      ? 'rgba(239,68,68,0.18)'
                      : i === 1
                      ? 'rgba(239,68,68,0.10)'
                      : 'rgba(255,255,255,0.04)',
                }}
              />
              <div className="relative flex items-center gap-3 px-3 py-2.5">
                {/* Rank */}
                <span className="text-sm w-5 shrink-0 text-center">
                  {i < 3 ? (
                    <span>{MEDAL[i]}</span>
                  ) : (
                    <span className="text-[11px] text-zinc-600">{i + 1}</span>
                  )}
                </span>

                {/* Optional Artwork */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-md object-cover shadow-md shadow-black/50"
                  />
                )}

                {/* Track / Artist info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate leading-tight">
                    {item.name}
                  </p>
                  {item.subtitle && (
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>

                {/* Play count */}
                <span
                  className={`text-xs font-semibold shrink-0 tabular-nums px-2 py-0.5 rounded-full ${
                    i === 0
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {item.play_count}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
