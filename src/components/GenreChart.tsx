import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { GenreEntry } from '../hooks/useStats'

interface GenreChartProps {
  data: GenreEntry[]
  loading: boolean
}

export default function GenreChart({ data, loading }: GenreChartProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Genre distribution
      </h3>

      {loading && <div className="h-52 bg-zinc-800 rounded-lg animate-pulse" />}

      {!loading && data.length === 0 && (
        <p className="text-zinc-500 text-sm">No genre data yet</p>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="genre"
              width={90}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#a1a1aa' }}
              formatter={(v: number) => [v, 'plays']}
            />
            <Bar dataKey="play_count" radius={[0, 4, 4, 0]} name="plays">
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={`rgba(239, 68, 68, ${Math.max(0.25, 1 - i * 0.08)})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
