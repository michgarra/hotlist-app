# Hotlist - Entertainment Recommendation Tracker

## Overview
Hotlist is a movie and TV show recommendation tracker. Users collect recommendations from friends, manage a personal "My List" of things to watch, track what they've watched with a flame rating system, and discover what's trending via a community Hotlist chart.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **External API**: TMDB (The Movie Database) for auto-populating titles with poster images, cast, directors, ratings, synopsis, backdrop images, and YouTube trailer keys

## Key Features
- Four-step onboarding: name/gender/age → streaming apps (AU market) → add friends → rating preference (IMDb or Rotten Tomatoes)
- Three-tab view: My List (personal to-watch) | HOTLIST (community chart) | Watched
- Community Hotlist: ranked chart showing titles added by all users, with trending up/down arrows based on recent activity
- Compact title cards with poster thumbnails, ratings, platform info
- TMDB-powered search when adding titles (auto-fills metadata)
- Status flow: Want to Watch / Hot / Watching / Watched
- "My Watching" quick-filter on My List tab to show only in-progress titles (status=Watching)
- Hot Rating (flame meter, 0.5–5 in 0.5 increments) when marking items as Watched; stored as real/float
- **Watch with**: free-text pill input on AddTitleSheet (separate from friends list — these are people on your couch); stored as `watch_with` comma-separated text; displayed in detail modal
- Share via WhatsApp/native share (prominent orange Share button in header, richer share text with item count)
- Swipe left to delete
- Drag to reorder (grip handle on each card; disabled when filters are active)
- Unified filter bar across all three tabs: type, genre (My List/Watched: + platform, friend, hot rating); platform list is case-insensitively deduplicated
- "All Ratings" display toggle on My List/Watched: IMDb ★ / RT 🍅 / 🔥 Mine / Friend — changes which rating shows on each card
- **Detail modal**: TMDB backdrop (16:9 landscape) as hero image; inline YouTube trailer playback (▶ Trailer button toggles iframe); community keywords ("Hotlist Members Say"); community reviews from other users; cast, director, synopsis, runtime/episodes; Watch with pills
- Friends panel (slide-up): add/remove friends, search friends list (shown when 5+ friends), tap a friend to expand and see items they've recommended; tap item to open detail
- Avatar in header opens settings popover with user name/email, "Share my list" link, and sign-out button
- **Share My List**: Each user has a private share token (UUID in user_profiles.list_token); "Share my list" generates a unique URL; recipient opens /list/:token, sees all non-Watched items, taps "+ Add" to copy any title to their own list (with full metadata); duplicate prevention; works for non-logged-in viewers too (read-only); dynamic server-side OG meta tags for rich iMessage/WhatsApp previews
- Beta allowlist via BETA_EMAILS env var
- Session expiry overlay with "Log back in" prompt

## Project Structure
- `shared/schema.ts` - Database schema and types (recommendations, userProfiles, friends); userId indexes on all tables
- `shared/routes.ts` - API route definitions
- `server/routes.ts` - Express route handlers including /api/hotlist (community chart), /api/community/:tmdbId (community tags+reviews), dynamic OG injection for /list/:token
- `server/storage.ts` - Database storage layer including getCommunityData()
- `server/tmdb.ts` - TMDB API integration; getTmdbDetails() returns backdropUrl + trailerKey
- `server/replit_integrations/auth/routes.ts` - Auth routes + BETA_EMAILS check
- `client/src/pages/Onboarding.tsx` - Four-step onboarding flow
- `client/src/pages/Dashboard.tsx` - Main page with 3-tab layout
- `client/src/pages/BetaWaitlist.tsx` - Shown to non-beta users
- `client/src/components/TitleCard.tsx` - Compact list card
- `client/src/components/HotlistChart.tsx` - Community ranked chart component
- `client/src/components/AddTitleSheet.tsx` - Add title with TMDB search; includes Watch with pill input and Recommended by friend selector
- `client/src/components/HotRatingDialog.tsx` - Flame rating dialog
- `client/src/components/DetailModal.tsx` - Full detail view with backdrop hero, trailer, community data, Watch with pills
- `client/src/components/SessionExpiredOverlay.tsx` - Session expiry overlay
- `client/src/pages/PublicList.tsx` - Public shared list view at /list/:token

## Database Schema Notes
- `recommendations.watch_with` - comma-separated names of people to watch with (separate concept from friends)
- `recommendations.watch_tags` - user's own tags after watching
- `recommendations.watch_review` - user's own review text
- `recommendations.recommended_by` - name of friend who recommended it
- `user_profiles.list_token` - UUID for share-my-list URL

## Font
- Plus Jakarta Sans (Google Fonts) → Inter → sans-serif

## Color Theme
- Primary: Orange (hsl 24 100% 50%) - Shows theme
- Clean light/dark mode support
- Mobile-first responsive design

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `TMDB_API_KEY` - The Movie Database API key (required for search/auto-populate)
- `SESSION_SECRET` - Session signing key
- `BETA_EMAILS` - Optional comma-separated list of allowed emails (open access if not set)

## Admin Board
- Route: `/admin` (requires auth + ADMIN_USER_IDS env var containing your user ID)
- Shows: overview stats, per-user table (list size, watched, tagged, friends, last active), weekly activity chart, top titles by user count, top community tags, genre breakdown
- Protected server-side via `ADMIN_USER_IDS` env var (comma-separated user IDs)

## Deployment
- Reserved VM (always-on, no cold starts)
- Build: `npm run build` → Run: `node ./dist/index.cjs`
- Self-ping keepalive: server pings `/api/health` every 4 min in production to prevent idle termination
