# YTMusic+ 🎵✨

YTMusic+ is a personal, highly intelligent bridge between your **Last.fm** listening history and **YouTube Music**. 
It replaces algorithmic probability with **deterministic intelligence**—building a closed-loop music ecosystem that generates perfectly balanced, fatigue-free playlists based purely on what *you* have proven you want to hear.

---

## 🚀 Key Features

*   **The Vibe Matrix (Smart Shuffle):** A custom PostgreSQL-driven recommendation engine. Instead of pushing viral trends, it forces a mathematical distribution based on your personal Affinity Scores:
    *   **45% High Tier:** Your obsessed, absolute favorites.
    *   **35% Mid Tier:** Familiar tracks to orbit your favorites without burning them out.
    *   **20% Low Tier:** Deep cuts and discovery from the fringes of your library.
    *   *Includes Genre/Vibe filtering (Techno, House, R&B, etc.) before applying the bucket distribution.*
*   **Chameleon Theming:** The dashboard UI dynamically extracts the dominant color from your top track's album artwork and generates a sleek, custom color palette using CSS variables (`useImageColor.ts`).
*   **Quota-Free YouTube Resolution:** Bypasses Google's expensive Search API quotas by using a stealth scraper (`youtube-sr`) in a Deno Edge Function to resolve text-based track names into 11-character YouTube Video IDs.
*   **Aggressive Caching:** Once a YouTube Video ID or album artwork is resolved, it is cached permanently in the Supabase `tracks` table.
*   **Automated Monthly Playlists:** A fully autonomous `pg_cron` job wakes up at midnight on the 1st of every month, uses an offline OAuth refresh token, generates a Smart Shuffle, and silently pushes a new "YTMusic+ Discovery" playlist to your YouTube account.

---

## 🏗️ Architecture Pipeline

1. **Ingestion (`sync-lastfm`):** An Edge Function periodically syncs your recent scrobbles from Last.fm to your Supabase PostgreSQL database (`tracks` and `plays` tables).
2. **The Brain (`generate_smart_shuffle`):** The React frontend calls a custom PL/pgSQL database RPC. The heavy math (Affinity Scoring, Bucketing, Randomization) happens instantly on the database level, returning 50 optimal tracks.
3. **Translation (`resolve-yt-ids`):** React hands the 50 tracks to a Deno Edge Function, which scrapes YouTube for the exact Video IDs and caches them back into the database.
4. **Execution (YouTube API):** Using Google OAuth 2.0, React hits the official YouTube Data API to create a new playlist and push the 50 Video IDs to your connected YouTube Music account.

*(For an interactive, deep-dive explanation of the engine and architecture, open `algo.html` and `architecture.html` in your browser).*

---

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), TypeScript, Tailwind CSS (optional), Lucide Icons, ColorThief.
*   **Backend & Auth:** Supabase, Google OAuth 2.0 (Offline Access).
*   **Database:** PostgreSQL, PL/pgSQL (RPCs), `pg_cron`.
*   **Edge Computing:** Deno (Supabase Edge Functions).
*   **External APIs:** Last.fm API, YouTube Data API v3.

---

## ⚙️ Environment Variables

To run this project locally, you need the following keys in your `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

*Note: `GOOGLE_CLIENT_SECRET` and `LASTFM_API_KEY` are stored securely inside Supabase Secrets for use by the Edge Functions.*

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Deploy Edge Functions (if modified):**
   ```bash
   supabase functions deploy
   ```

---

*Designed for personal intelligence. No ads, no commercial pushes. Just your music, optimized.*