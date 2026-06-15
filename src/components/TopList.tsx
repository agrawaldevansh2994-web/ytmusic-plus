export interface TopItem {
  name: string
  subtitle?: string
  play_count: number
}

interface TopListProps {
  title: string
  items: TopItem[]
  loading: boolean
}

export default function TopList({ title, items, loading }: TopListProps) {
  const max = Math.max(1, items[0]?.play_count ?? 1)

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </h3>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-zinc-500 text-sm">No data yet</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="relative rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-zinc-800 rounded-lg"
                style={{ width: `${(item.play_count / max) * 100}%` }}
              />
              <div className="relative flex items-center gap-2 px-3 py-2">
                <span className="text-xs text-zinc-500 w-4 shrink-0 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.name}</p>
                  {item.subtitle && (
                    <p className="text-xs text-zinc-400 truncate">{item.subtitle}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-400 shrink-0">{item.play_count}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
