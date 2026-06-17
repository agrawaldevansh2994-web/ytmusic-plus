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

const RED_PALETTE = [
  'rgba(239,68,68,1)',
  'rgba(239,68,68,0.82)',
  'rgba(239,68,68,0.66)',
  'rgba(239,68,68,0.52)',
  'rgba(239,68,68,0.40)',
  'rgba(239,68,68,0.30)',
  'rgba(239,68,68,0.22)',
  'rgba(239,68,68,0.16)',
  'rgba(239,68,68,0.12)',
  'rgba(239,68,68,0.09)',
]

export default function GenreChart({ data, loading }: GenreChartProps) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        Genre distribution
      </h3>

      {loading && <div className="h-56 bg-zinc-800/50 rounded-xl animate-pulse" />}

      {!loading && data.length === 0 && (
        <p className="text-zinc-600 text-sm py-4 text-center">No genre data yet — tags are still syncing</p>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 28, top: 0, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="genre"
              width={96}
              tick={{ fill: '#71717a', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
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
            <Bar dataKey="play_count" radius={[0, 6, 6, 0]} name="plays" maxBarSize={22}>
              {data.map((_, i) => (
                <Cell key={i} fill={RED_PALETTE[Math.min(i, RED_PALETTE.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
