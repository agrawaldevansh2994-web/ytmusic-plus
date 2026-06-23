export interface TopItem {
  name: string
  subtitle?: string
  play_count: number
  image_url?: string
  genre_tags?: string[]
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
              className="h-11 skeleton rounded-xl"
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
          {items.map((item, i) => {
            const query = encodeURIComponent(`${item.name} ${item.subtitle ?? ''}`.trim())
            return (
              <li
                key={i}
                className="relative group rounded-xl overflow-hidden animate-row-in"
                style={{ animationDelay: `${i * 45}ms` }}
              >
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
                <a
                  href={`https://music.youtube.com/search?q=${query}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  {/* Rank — swaps to a play icon on hover */}
                  <span className="text-sm w-5 shrink-0 text-center relative">
                    <span className="group-hover:opacity-0 transition-opacity duration-200">
                      {i < 3 ? MEDAL[i] : <span className="text-[11px] text-zinc-600">{i + 1}</span>}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-red-400 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
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
                    <p className="text-sm font-medium text-zinc-100 truncate leading-tight group-hover:text-red-400 transition-colors">
                      {item.name}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.subtitle}</p>
                    )}
                    {item.genre_tags && item.genre_tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.genre_tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 capitalize">
                            {tag}
                          </span>
                        ))}
                      </div>
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
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
