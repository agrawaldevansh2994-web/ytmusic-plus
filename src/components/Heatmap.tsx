import type { HeatmapCell } from '../hooks/useStats'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS: Record<number, string> = { 0: '12a', 6: '6a', 12: '12p', 18: '6p', 23: '11p' }

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
    if (count === 0) return 'rgba(39,39,42,0.6)'
    const intensity = Math.max(0.12, count / max)
    return `rgba(239,68,68,${intensity})`
  }

  function cellBorder(dow: number, hour: number): string {
    const count = lookup.get(`${dow}-${hour}`) ?? 0
    if (count === 0) return 'transparent'
    return `rgba(239,68,68,${Math.min(0.4, (count / max) * 0.6)})`
  }

  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        Listening heatmap <span className="text-zinc-700 normal-case font-normal">(IST)</span>
      </h3>

      {loading && <div className="h-40 bg-zinc-800/50 rounded-xl animate-pulse" />}

      {!loading && (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour labels row */}
            <div className="flex mb-1.5" style={{ paddingLeft: 38 }}>
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} style={{ width: 16, marginRight: 2, textAlign: 'center' }}>
                  {HOUR_LABELS[h] !== undefined && (
                    <span className="text-[9px] text-zinc-600 font-medium">{HOUR_LABELS[h]}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {DAYS.map((day, dow) => (
              <div key={dow} className="flex items-center mb-1">
                <span
                  className="text-[10px] text-zinc-600 shrink-0 text-right pr-2 font-medium"
                  style={{ width: 36 }}
                >
                  {day}
                </span>
                {Array.from({ length: 24 }).map((_, h) => {
                  const count = lookup.get(`${dow}-${h}`) ?? 0
                  return (
                    <div
                      key={h}
                      className="rounded shrink-0 transition-transform hover:scale-125 cursor-default"
                      style={{
                        width: 16,
                        height: 16,
                        marginRight: 2,
                        backgroundColor: cellBg(dow, h),
                        border: `1px solid ${cellBorder(dow, h)}`,
                      }}
                      title={`${day} ${h}:00–${h + 1}:00 — ${count} ${count === 1 ? 'play' : 'plays'}`}
                    />
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-4" style={{ paddingLeft: 38 }}>
              <span className="text-[10px] text-zinc-600 mr-1">Less</span>
              {[0, 0.15, 0.35, 0.6, 0.85, 1].map((a) => (
                <div
                  key={a}
                  className="rounded"
                  style={{
                    width: 13,
                    height: 13,
                    backgroundColor: a === 0 ? 'rgba(39,39,42,0.6)' : `rgba(239,68,68,${a})`,
                  }}
                />
              ))}
              <span className="text-[10px] text-zinc-600 ml-1">More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
