import type { RecentPlay } from '../hooks/useStats'

interface RecentPlaysProps {
  items: RecentPlay[]
  loading: boolean
}

function formatTimeAgo(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diffInSeconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
}

export default function RecentPlays({ items, loading }: RecentPlaysProps) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
        Recent plays
      </h3>

      {loading && (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-11 bg-zinc-800/50 rounded-xl animate-pulse"
              style={{ opacity: 1 - i * 0.12 }}
            />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-zinc-600 text-sm py-4 text-center">No plays yet</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((play, i) => {
            const hasVideo = play.youtube_video_id && play.youtube_video_id !== '__not_found__'

            const row = (
              <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                {play.image_url ? (
                  <img
                    src={play.image_url}
                    alt={play.title}
                    className="w-10 h-10 rounded-md object-cover shadow-md shadow-black/50 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-zinc-800 shrink-0 flex items-center justify-center text-zinc-600 text-xs">
                    ♪
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate leading-tight">{play.title}</p>
                  <p className="text-[11px] text-zinc-500 truncate mt-0.5">{play.artist}</p>
                </div>
                <span className="text-[11px] text-zinc-600 shrink-0 tabular-nums">
                  {formatTimeAgo(play.played_at)}
                </span>
              </div>
            )

            return (
              <li key={i}>
                {hasVideo ? (
                  <a
                    href={`https://music.youtube.com/watch?v=${play.youtube_video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {row}
                  </a>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
