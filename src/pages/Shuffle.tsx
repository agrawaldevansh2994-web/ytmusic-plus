import { useState, useEffect } from 'react'
import { useShuffle, useTasteSummary } from '../hooks/useShuffle'
import type { ShuffleTrack } from '../hooks/useShuffle'
import { supabase } from '../lib/supabase'

const PERSONA_META: Record<string, { emoji: string; label: string; color: string }> = {
  morning:   { emoji: '🌅', label: 'Morning listener',   color: 'from-amber-900/30 to-transparent' },
  afternoon: { emoji: '☀️', label: 'Afternoon listener', color: 'from-yellow-900/30 to-transparent' },
  evening:   { emoji: '🌆', label: 'Evening listener',   color: 'from-orange-900/30 to-transparent' },
  night:     { emoji: '🌙', label: 'Night owl',          color: 'from-indigo-900/30 to-transparent' },
}

const TIER_META: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  high: { emoji: '🔥', label: 'Favourite',  bg: 'bg-red-500/15',    text: 'text-red-400'   },
  mid:  { emoji: '⭐', label: 'Liked',      bg: 'bg-amber-500/15',  text: 'text-amber-400' },
  low:  { emoji: '🎲', label: 'Discovery',  bg: 'bg-zinc-700/40',   text: 'text-zinc-400'  },
}

const VIBES = [
  { id: 'all', label: 'Everything' },
  { id: 'techno', label: 'Techno' },
  { id: 'schranz', label: 'Schranz' },
  { id: 'house', label: 'House' },
  { id: 'trance', label: 'Trance' },
  { id: 'rnb', label: 'R&B' },
  { id: 'hip-hop', label: 'Hip-Hop' },
  { id: 'pop', label: 'Pop' },
  { id: 'indie', label: 'Indie' },
  { id: 'rock', label: 'Rock' }
]

const YT_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

// ── YouTube playlist creation via OAuth ───────────────────────────────────────
async function createYouTubePlaylist(
  accessToken: string,
  title: string,
  tracks: (ShuffleTrack & { youtube_video_id?: string })[]
): Promise<string> {
  // 1. Create empty playlist
  const createRes = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      snippet: { title, description: '' },
      status: { privacyStatus: 'private' },
    }),
  })
  const { id: playlistId } = await createRes.json()
  if (!playlistId) throw new Error('Failed to create playlist')

  // 2. Add each track that has a resolved video ID
  const validTracks = tracks.filter((t) => t.youtube_video_id && t.youtube_video_id !== '__not_found__')
  for (const track of validTracks) {
    await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: track.youtube_video_id } },
      }),
    })
  }

  return playlistId
}

// ── Google OAuth helper ───────────────────────────────────────────────────────
function signInWithGoogle(): void {
  const params = new URLSearchParams({
    client_id: YT_CLIENT_ID,
    redirect_uri: `${window.location.origin}/shuffle`,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/youtube',
    include_granted_scopes: 'true',
  })
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Shuffle() {
  const { summary, loading: summaryLoading } = useTasteSummary()
  const { playlist, loading, generated, generate } = useShuffle()
  const [size, setSize] = useState(25)
  const [vibe, setVibe] = useState('all')
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle')
  const [ytPlaylistUrl, setYtPlaylistUrl] = useState<string | null>(null)
  const [oauthToken, setOauthToken] = useState(() => localStorage.getItem('yt_access_token'))

  useEffect(() => {
    const handleCode = async () => {
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')
      if (code) {
        setPushState('pushing')
        window.history.replaceState({}, '', window.location.pathname)
        
        try {
          const { data, error } = await supabase.functions.invoke('youtube-oauth-exchange', {
            body: {
              code,
              redirectUri: `${window.location.origin}/shuffle`
            }
          })
          
          if (error) throw error
          if (data?.access_token) {
            localStorage.setItem('yt_access_token', data.access_token)
            const expiresAt = Date.now() + (data.expires_in * 1000)
            localStorage.setItem('yt_token_expires_at', expiresAt.toString())
            setOauthToken(data.access_token)
            setPushState('idle')
          }
        } catch (err) {
          console.error('Failed to exchange token', err)
          setPushState('error')
        }
      } else {
        // Check if token is expired, if so try to refresh it automatically
        const expiresAt = localStorage.getItem('yt_token_expires_at')
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
          refreshAccessToken()
        }
      }
    }
    
    handleCode()
  }, [])

  // ── 1-Click Vibes: preselect a vibe (and optionally auto-generate) from the URL ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const vibeParam = params.get('vibe')
    const auto = params.get('auto')
    if (!vibeParam || !VIBES.some((v) => v.id === vibeParam)) return

    setVibe(vibeParam)
    if (auto === '1') {
      generate(size, vibeParam)
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshAccessToken() {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-oauth-exchange', {
        body: { action: 'refresh' }
      })
      if (error) throw error
      if (data?.access_token) {
        localStorage.setItem('yt_access_token', data.access_token)
        const expiresAt = Date.now() + (data.expires_in * 1000)
        localStorage.setItem('yt_token_expires_at', expiresAt.toString())
        setOauthToken(data.access_token)
        return data.access_token
      }
    } catch (err) {
      console.error('Failed to refresh token automatically', err)
      localStorage.removeItem('yt_access_token')
      localStorage.removeItem('yt_token_expires_at')
      setOauthToken(null)
    }
    return null
  }

  const persona = PERSONA_META[summary?.persona ?? 'evening']

  function handleDisconnect() {
    localStorage.removeItem('yt_access_token')
    localStorage.removeItem('yt_token_expires_at')
    setOauthToken(null)
    setPushState('idle')
  }

  async function handleGenerate(n: number) {
    await generate(n, vibe)
  }

  async function handlePushToYouTube() {
    let currentToken = oauthToken
    
    // Check if we need to refresh right before pushing
    const expiresAt = localStorage.getItem('yt_token_expires_at')
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      setPushState('pushing') // show spinner during refresh
      currentToken = await refreshAccessToken()
    }

    if (!currentToken) {
      signInWithGoogle()
      return
    }
    
    setPushState('pushing')
    try {
      const tracks = playlist
      const nextIndexStr = localStorage.getItem('smart_shuffle_index') || '4'
      const nextIndex = parseInt(nextIndexStr, 10)
      const title = `Smart Shuffle ${nextIndex}`
      localStorage.setItem('smart_shuffle_index', (nextIndex + 1).toString())
      const playlistId = await createYouTubePlaylist(currentToken, title, tracks as any)
      const url = `https://music.youtube.com/playlist?list=${playlistId}`
      setYtPlaylistUrl(url)
      setPushState('done')

      supabase
        .rpc('log_manual_playlist', {
          p_title: title,
          p_youtube_playlist_id: playlistId,
          p_youtube_playlist_url: url,
          p_requested_size: size,
          p_target_genre: vibe !== 'all' ? vibe : null,
          p_tracks: tracks.map((t) => ({
            title: t.title,
            artist: t.artist,
            tier: t.tier,
            affinity_score: t.affinity_score,
            youtube_video_id: t.youtube_video_id,
          })),
        })
        .then(({ error }) => {
          if (error) console.warn('Failed to log playlist:', error)
        })
    } catch {
      // If it still fails, the token is likely completely invalid
      localStorage.removeItem('yt_access_token')
      localStorage.removeItem('yt_token_expires_at')
      setOauthToken(null)
      setPushState('error')
    }
  }

  const displayPlaylist = playlist

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight leading-none">
          YTMusic<span className="text-red-500">+</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Smart Shuffle</p>
      </header>

      {/* ── Taste persona card ────────────────────────────────────── */}
      {!summaryLoading && summary && (
        <div className={`rounded-2xl p-5 mb-5 border border-zinc-800/50 bg-gradient-to-br ${persona.color} bg-zinc-900/60`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{persona.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">{persona.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Based on your listening history</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {summary.topGenres.slice(0, 4).map((g) => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 w-20 shrink-0 capitalize truncate">{g.name}</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${g.score * 100}%` }} />
                </div>
                <span className="text-[10px] text-zinc-600 w-7 text-right tabular-nums">
                  {Math.round(g.score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Vibe Selector ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVibe(v.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 border ${
              vibe === v.id
                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Controls ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {[15, 25, 40].map((n) => (
            <button key={n} onClick={() => setSize(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                size === n ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => handleGenerate(size)} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold
            bg-red-500 hover:bg-red-400 active:scale-95 text-white transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/20">
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
          ) : (
            <><span>{generated ? '🔄' : '✨'}</span>{generated ? 'Regenerate' : 'Generate Playlist'}</>
          )}
        </button>
      </div>

      {/* ── Push to YouTube button ────────────────────────────────── */}
      {generated && !loading && (
        <div className="mb-5">
          {pushState === 'done' && ytPlaylistUrl ? (
            <a href={ytPlaylistUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold
                bg-zinc-800 hover:bg-zinc-700 text-white transition-all duration-200 border border-zinc-700">
              <YTIcon />
              Open in YouTube Music ↗
            </a>
          ) : (
            <button onClick={handlePushToYouTube} disabled={pushState === 'pushing'}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold
                bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white transition-all duration-200
                border border-zinc-700 disabled:opacity-50">
              {pushState === 'pushing' ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating playlist…</>
              ) : (
                <><YTIcon />{YT_CLIENT_ID ? 'Push to YouTube Music' : 'Set VITE_GOOGLE_CLIENT_ID to enable'}</>
              )}
            </button>
          )}
          {pushState === 'error' && (
            <p className="text-[11px] text-red-400 text-center mt-1.5">Failed to create playlist. Try signing in again.</p>
          )}
          {oauthToken && pushState !== 'pushing' && (
            <button onClick={handleDisconnect} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors w-full text-center mt-2 block">
              Disconnect YouTube Music
            </button>
          )}
        </div>
      )}

      {/* ── Tier legend ───────────────────────────────────────────── */}
      {generated && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(TIER_META).map(([tier, meta]) => (
            <span key={tier}
              className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${meta.bg} ${meta.text}`}>
              {meta.emoji} {meta.label}
            </span>
          ))}
          <span className="text-[11px] text-zinc-600 self-center ml-auto">{playlist.length} tracks</span>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!generated && !loading && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎧</p>
          <p className="text-zinc-400 text-sm font-medium">Your taste, intelligently shuffled</p>
          <p className="text-zinc-600 text-xs mt-1">Picks from your favourites with a dash of discovery</p>
        </div>
      )}

      {/* ── Playlist ──────────────────────────────────────────────── */}
      {generated && !loading && (
        <ul className="space-y-1.5">
          {displayPlaylist.map((track, i) => (
            <TrackRow key={i} track={track} index={i} />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── TrackRow ─────────────────────────────────────────────────────────────── */
function TrackRow({ track, index }: {
  track: ShuffleTrack & { youtube_video_id?: string }
  index: number
}) {
  const tier = TIER_META[track.tier]
  const hasVideo = track.youtube_video_id && track.youtube_video_id !== '__not_found__'

  const RowContent = () => (
    <>
      <span className="text-[11px] text-zinc-600 w-5 text-right shrink-0 tabular-nums">{index + 1}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate leading-tight group-hover:text-red-400 transition-colors">{track.title}</p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
        {track.genre_tags?.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {track.genre_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 capitalize">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {hasVideo ? (
        <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400">
          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </span>
      ) : track.youtube_video_id === '__not_found__' ? (
        <span className="shrink-0 flex items-center justify-center w-7 h-7" title="Not found on YouTube">
          <span className="text-[10px] text-zinc-600">—</span>
        </span>
      ) : (
        <span className="shrink-0 flex items-center justify-center w-7 h-7" title="Resolving video ID...">
          <span className="w-2.5 h-2.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
        </span>
      )}

      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${tier.bg} ${tier.text}`}
        title={tier.label}>
        {tier.emoji}
      </span>

      <div className="shrink-0 w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${track.affinity_score * 100}%` }} />
      </div>
    </>
  )

  const className = "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-all duration-150 group cursor-pointer"

  return hasVideo ? (
    <a href={`https://music.youtube.com/watch?v=${track.youtube_video_id}`} target="_blank" rel="noopener noreferrer" className={className}>
      <RowContent />
    </a>
  ) : (
    <div className={className}>
      <RowContent />
    </div>
  )
}

function YTIcon() {
  return (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}
