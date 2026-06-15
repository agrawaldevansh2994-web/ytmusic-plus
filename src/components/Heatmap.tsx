import type { HeatmapCell } from '../hooks/useStats'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_MARKERS = new Set([0, 6, 12, 18, 23])

interface HeatmapProps {
  data: HeatmapCell[]
  loading: boolean
}

export default function Heatmap({ data, loading }: HeatmapProps) {
  const lookup = new Map<string, number>()
  let max = 1
  for (const cell of data) {
    const key = `${cell.dow}-${cell.hour}`
    lookup.set(key, cell.play_count)
    if (cell.play_count > max) max = cell.play_count
  }

  function cellBg(dow: number, hour: number): string {
    const count = lookup.get(`${dow}-${hour}`) ?? 0
    if (count === 0) return '#18181b'
    return `rgba(239, 68, 68, ${Math.max(0.15, count / max)})`
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Listening heatmap
      </h3>

      {loading && <div className="h-36 bg-zinc-800 rounded-lg animate-pulse" />}

      {!loading && (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour labels */}
            <div className="flex mb-1" style={{ paddingLeft: 36 }}>
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  style={{ width: 14, marginRight: 2, textAlign: 'center' }}
                >
                  {HOUR_MARKERS.has(h) && (
                    <span className="text-[10px] text-zinc-500">{h}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            {DAYS.map((day, dow) => (
              <div key={dow} className="flex items-center mb-0.5">
                <span
                  className="text-[10px] text-zinc-500 shrink-0 text-right pr-2"
                  style={{ width: 34 }}
                >
                  {day}
                </span>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div
                    key={h}
                    className="rounded-sm shrink-0"
                    style={{
                      width: 14,
                      height: 14,
                      marginRight: 2,
                      backgroundColor: cellBg(dow, h),
                    }}
                    title={`${day} ${h}:00 — ${lookup.get(`${dow}-${h}`) ?? 0} plays`}
                  />
                ))}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3" style={{ paddingLeft: 36 }}>
              <span className="text-[10px] text-zinc-500 mr-1">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((a) => (
                <div
                  key={a}
                  className="rounded-sm"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: a === 0 ? '#18181b' : `rgba(239, 68, 68, ${a})`,
                  }}
                />
              ))}
              <span className="text-[10px] text-zinc-500 ml-1">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
