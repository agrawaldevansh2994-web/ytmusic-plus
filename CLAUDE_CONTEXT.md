# Context for Claude

This document contains specific context regarding recent architectural changes and decisions made in this project that may not be immediately obvious from reading the code.

## 1. Google OAuth & Token Persistence
- **Storage Shift:** We switched the YouTube OAuth access token storage in `src/pages/Shuffle.tsx` from `sessionStorage` to `localStorage` (`yt_access_token` and `yt_token_expires_at`). This was done so the user doesn't have to repeatedly authenticate between sessions or tabs.
- **Refresh Token Automation:** To fully eliminate manual re-authentication prompts, the `youtube-oauth-exchange` Edge Function now supports an `action: 'refresh'` flow. `Shuffle.tsx` automatically detects when the `yt_token_expires_at` has passed and silently refreshes the token in the background before pushing to YouTube.
- **Client ID Reset:** The user accidentally committed the Google OAuth Client Secret to Git. To fix this, a **brand new Google OAuth Client ID and Secret** were generated. If authentication fails, ensure that both `VITE_GOOGLE_CLIENT_ID` (in `.env.local` / Vercel) and the `GOOGLE_CLIENT_SECRET` (in Supabase Edge Function Secrets) are perfectly aligned with the new credentials.

## 2. Indian/Hindi Song Exclusion Logic
- **The Requirement:** The user explicitly requested that all Indian/Hindi songs be included in general listening statistics (heatmaps, top tracks) but **completely excluded from the Smart Shuffle recommendation engine**.
- **The Implementation:** This was solved entirely in the database via the `generate_smart_shuffle` RPC function (see migration `20260620092907_exclude_indian_songs_from_shuffle.sql`). We added a strict `NOT EXISTS` clause checking `genre_tags` for arrays matching `'%hindi%'`, `'%bollywood%'`, `'%indian%'`, `'%punjabi%'`, etc. Do not remove this logic if you touch the shuffle algorithm.

## 3. Genre Consolidation & Tags
- The database `generate_smart_shuffle` function and frontend `VIBES` array were updated to merge sub-genres. When the user requests **"Schranz"**, the database queries `schranz, hard techno, acid, dark techno, emotional techno`. When **"Trance"** is requested, it queries `trance, psytrance`.
- The `RecentPlays` component now proudly displays these `genre_tags` (fetched via Last.fm) directly below the track names, matching the aesthetic of the Smart Shuffle UI.

## 4. Upcoming Priority: Last.fm Inspired UI Revamp
- The user's next primary objective is to redesign the analytics/dashboard UI heavily inspired by **Last.fm**. 
- **Planned Features:** 
  1. Top-level colorful stat cards (Purple/Green/Blue) for Artists, Albums, and Tracks.
  2. Large "Hero" cards with full-background artwork for the #1 Top Artist/Album/Track.
  3. Advanced Data Visualizations (e.g., Weekly Scrobble Trend bar charts, "Vibe Fingerprint" radar charts, and Listening Diversity rings).
  4. Quick-action widgets ("Play My Mix", "1-Click Vibes").
  5. Hover-actions on track lists to play directly or 'heart' to increase affinity tier.

## 5. SaaS / Multi-tenant Roadmap
- The user plans to convert this personal tool into a public SaaS application. 
- **Next Steps for SaaS (When requested):**
  1. Add standard Supabase Authentication (e.g. Google Sign-In).
  2. Implement Row Level Security (RLS) policies on `tracks`, `plays`, and `taste_profile` so users only access data tied to their specific `user_id`.
  3. Modify the existing `pg_cron` jobs (`sync-lastfm` and `resolve-yt-ids`) to iterate over an active users table rather than executing globally.
  4. Ensure OAuth tokens (or refresh tokens) are managed securely per-user in the `sync_state` or a new auth-linked table.
