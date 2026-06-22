import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import type { GenreEntry } from '../hooks/useStats'

interface VibeRadarProps {
  data: GenreEntry[]
  loading: boolean
}

export default function VibeRadar({ data, loading }: VibeRadarProps) {
  // We only want the top 6 genres for a clean radar chart
  const chartData = data.slice(0, 6)
  
  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 h-full flex flex-col items-center justify-center">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4 w-full text-left">
        Vibe Fingerprint
      </h3>

      {loading && <div className="h-56 w-56 bg-zinc-800/50 rounded-full animate-pulse my-auto" />}

      {!loading && data.length === 0 && (
        <p className="text-zinc-600 text-sm py-4 text-center my-auto">No genre data yet</p>
      )}

      {!loading && data.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis 
              dataKey="genre" 
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
              tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
            />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: 10,
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: '#f4f4f5', fontWeight: 600, textTransform: 'capitalize' }}
              itemStyle={{ color: '#ef4444' }}
              formatter={(v: number) => [`${v} plays`, '']}
            />
            <Radar
              name="Vibe"
              dataKey="play_count"
              stroke="var(--theme-color-light, #ef4444)"
              strokeWidth={2}
              fill="rgba(var(--theme-color-rgb, 239, 68, 68), 0.4)"
            />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
