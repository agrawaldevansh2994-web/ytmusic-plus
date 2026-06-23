import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { WeeklyScrobble } from '../hooks/useStats'

interface WeeklyChartProps {
  data: WeeklyScrobble[]
  loading: boolean
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeeklyChart({ data, loading }: WeeklyChartProps) {
  // Parse the YYYY-MM-DD as a local date and tag each bar with a short weekday label.
  const chartData = data.map((d) => {
    const [y, m, day] = d.day.split('-').map(Number)
    const date = new Date(y, m - 1, day)
    return { ...d, label: WEEKDAY[date.getDay()] }
  })

  const total = chartData.reduce((sum, d) => sum + d.play_count, 0)
  const peak = chartData.reduce((max, d) => Math.max(max, d.play_count), 0)

  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Last 7 days
        </h3>
        {!loading && total > 0 && (
          <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
            {total} scrobbles
          </span>
        )}
      </div>

      {loading && <div className="h-56 bg-zinc-800/50 rounded-xl animate-pulse" />}

      {!loading && total === 0 && (
        <p className="text-zinc-600 text-sm py-4 text-center">No plays in the last 7 days</p>
      )}

      {!loading && total > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#71717a', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 10,
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#f4f4f5', fontWeight: 600 }}
              itemStyle={{ color: '#a1a1aa' }}
              formatter={(v: number) => [`${v} plays`, '']}
            />
            <Bar dataKey="play_count" radius={[6, 6, 0, 0]} name="plays" maxBarSize={40}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.play_count === peak
                      ? 'rgba(239,68,68,1)'
                      : 'rgba(239,68,68,0.40)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
