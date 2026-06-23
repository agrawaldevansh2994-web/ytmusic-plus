# YTMusic-Plus Handover Document

## Current Status (End of Phase 5 — Session 2)

### Git State
- Branch: `main`
- **3 local commits unpushed** (user will push manually — credentials issue with devde/agraw profile split):
  - `c144626` — premium UI upgrade
  - `bb2c100` — OAuth silent refresh fix
  - `3d3d97b` — YouTube playlist insert fix

---

### What Was Done This Session

#### 1. Premium UI Upgrade (`c144626`)
- Inter font weights extended to 800/900
- `src/index.css`: shimmer skeleton, shine sweep on hover, ambient float animation, staggered row entrance, `prefers-reduced-motion` support
- `src/hooks/useCountUp.ts` (new): easeOutCubic count-up animation for stat numbers
- `src/components/Reveal.tsx` (new): IntersectionObserver scroll-reveal wrapper
- `src/pages/Dashboard.tsx`:
  - 6-card stat grid (added **Listening Time** + **Avg Plays/Artist** — data was already fetched, just unused)
  - Scrobbles + Artists cards now count up on load/period switch
  - Animated ambient background glows (drift)
  - All lower sections (hero, lists, charts, heatmap, recent plays) wrapped in `<Reveal>` for scroll-in
  - HeroCard: now clickable → opens YouTube Music search; hover shows play button overlay; shine sweep on hover
  - **1-Click Vibes**: replaced `alert('coming soon')` with live mood picker panel (8 genres); clicking a mood navigates to `/shuffle?vibe=<id>&auto=1`
- `src/pages/Shuffle.tsx`: reads `vibe` + `auto` URL params → preselects genre chip + auto-generates playlist on arrival
- `src/components/TopList.tsx`: all rows clickable → YT Music search; rank number swaps to play icon on hover; staggered entrance; shimmer skeletons
- `src/components/RecentPlays.tsx`: play overlay on artwork hover; non-video rows fall back to YT Music search; staggered entrance; shimmer skeletons

#### 2. OAuth Silent Refresh Fix (`bb2c100`)
**Problem:** On mobile, clearing browser storage removed `yt_token_expires_at` from localStorage. Code only attempted silent refresh if that key existed → skipped refresh entirely → fell through to full Google OAuth consent (3-4 taps every time).
**Fix:** Now attempts server-side silent refresh whenever there is no valid local token, regardless of whether the expiry key is present. The DB refresh token (stored on first auth in `sync_state.youtube_refresh_token`) handles the rest silently.

#### 3. YouTube Playlist Insert Fix (`3d3d97b`)
**Problem:** The `for` loop inserting tracks into YouTube Music playlists never checked the response — any failed insert (deleted video, region-blocked, rate-limited) was silently dropped. This caused 28/40 tracks reaching YT instead of 40.
**Fix:**
- Each insert response is now checked
- 429 rate-limit triggers a 2s pause + one retry
- 100ms gap between inserts to avoid per-minute throttle
- UI now shows "✓ 28/40 tracks added — 12 unavailable on YouTube" after push

---

### MCP Setup (important)
- `supabase-ytmusic` — **correct account**, use this for all DB work on this project
- `claude_ai_Supabase` — **wrong account** (Devansh-AIprojects's Org), do not use for this project
- `chrome-devtools`, `cricket`, `x-twitter` — all connected at user scope

---

## Next Steps (Phase 5 continued)

1. **Top Albums widget** — needs a new `get_top_albums` RPC in the DB (query `plays` grouped by album). Frontend card already has a slot in the grid.
2. **Weekly scrobble trend chart** — needs a `get_weekly_scrobbles` RPC returning 7 days of play counts; render as a bar chart using recharts (already installed).
3. **Automated CRON sync** — background Edge Function to pull new Last.fm liked songs on schedule and trigger `resolve-yt-ids`.
4. **Frontend "Last synced" + manual Sync Now button** — the `sync_state` table already has `lastfm_last_synced_at`; just need a button that calls the `sync-lastfm` Edge Function.
5. **RLS lockdown** — Row Level Security on `tracks`, `plays`, `taste_profile` for when the app goes public/SaaS.

*To the next session: use `supabase-ytmusic` MCP. Read `CLAUDE_CONTEXT.md` too.*
