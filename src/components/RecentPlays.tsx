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
              className="h-11 skeleton rounded-xl"
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
            const href = hasVideo
              ? `https://music.youtube.com/watch?v=${play.youtube_video_id}`
              : `https://music.youtube.com/search?q=${encodeURIComponent(`${play.title} ${play.artist}`)}`

            return (
              <li key={i} className="animate-row-in" style={{ animationDelay: `${i * 45}ms` }}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="relative w-10 h-10 shrink-0">
                    {play.image_url ? (
                      <img
                        src={play.image_url}
                        alt={play.title}
                        className="w-10 h-10 rounded-md object-cover shadow-md shadow-black/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                        ♪
                      </div>
                    )}
                    {/* Play overlay on hover */}
                    <div className="absolute inset-0 rounded-md bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate leading-tight group-hover:text-red-400 transition-colors">{play.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{play.artist}</p>
                    {play.genre_tags && play.genre_tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {play.genre_tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 capitalize">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-600 shrink-0 tabular-nums">
                    {formatTimeAgo(play.played_at)}
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
