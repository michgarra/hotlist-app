# Hotlist - Entertainment Recommendation Tracker

## Overview
Hotlist is a movie and TV show recommendation tracker. Users collect recommendations from friends, manage a personal "My List" of things to watch, track what they've watched with a flame rating system, and discover what's trending via a community Hotlist chart.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **External API**: TMDB (The Movie Database) for auto-populating titles with poster images, cast, directors, ratings, synopsis

## Key Features
- Four-step onboarding: name/gender/age → streaming apps (AU market) → add friends → rating preference (IMDb or Rotten Tomatoes)
- Three-tab view: My List (personal to-watch) | HOTLIST (community chart) | Watched
- Community Hotlist: ranked chart showing titles added by all users, with trending up/down arrows based on recent activity
- Compact title cards with poster thumbnails, ratings, platform info
- TMDB-powered search when adding titles (auto-fills metadata)
- Status flow: Want to Watch / Hot / Watching / Watched
- Hot Rating (flame meter, 0.5–5 in 0.5 increments) when marking items as Watched; stored as real/float
- Share via WhatsApp/native share
- Swipe left to delete
- Drag to reorder (grip handle on each card; disabled when filters are active)
- Unified filter bar across all three tabs: type, genre (My List/Watched: + platform, friend, hot rating); platform list is case-insensitively deduplicated
- "All Ratings" display toggle on My List/Watched: IMDb ★ / RT 🍅 / 🔥 Mine / Friend — changes which rating shows on each card
- Detail modal with cast, director, synopsis, runtime/episodes
- Friends panel (slide-up): add/remove friends, search friends list (shown when 5+ friends), tap a friend to expand and see items they've recommended; tap item to open detail
- Avatar in header opens settings popover with user name/email and sign-out button
- Beta allowlist via BETA_EMAILS env var
- Session expiry overlay with "Log back in" prompt

## Project Structure
- `shared/schema.ts` - Database schema and types (recommendations, userProfiles, friends); userId indexes on all tables
- `shared/routes.ts` - API route definitions
- `server/routes.ts` - Express route handlers including /api/hotlist (community chart)
- `server/storage.ts` - Database storage layer
- `server/tmdb.ts` - TMDB API integration
- `server/replit_integrations/auth/routes.ts` - Auth routes + BETA_EMAILS check
- `client/src/pages/Onboarding.tsx` - Four-step onboarding flow
- `client/src/pages/Dashboard.tsx` - Main page with 3-tab layout
- `client/src/pages/BetaWaitlist.tsx` - Shown to non-beta users
- `client/src/components/TitleCard.tsx` - Compact list card
- `client/src/components/HotlistChart.tsx` - Community ranked chart component
- `client/src/components/AddTitleSheet.tsx` - Add title with TMDB search
- `client/src/components/HotRatingDialog.tsx` - Flame rating dialog
- `client/src/components/DetailModal.tsx` - Full detail view
- `client/src/components/SessionExpiredOverlay.tsx` - Session expiry overlay

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

## Deployment
- Reserved VM (always-on, no cold starts)
- Build: `npm run build` → Run: `node ./dist/index.cjs`
