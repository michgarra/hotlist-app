# Hotlist - Entertainment Recommendation Tracker

## Overview
Hotlist is a movie and TV show recommendation tracker. Users collect recommendations from friends, manage a "Hotlist" of things to watch, and track what they've watched with a flame rating system.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **External API**: TMDB (The Movie Database) for auto-populating titles with poster images, cast, directors, ratings, synopsis

## Key Features
- Two-tab view: Hotlist (to watch) and Watched
- Compact title cards with poster thumbnails, ratings, platform info
- TMDB-powered search when adding titles (auto-fills metadata)
- Status flow: Want to Watch / Interested / Watching / Watched
- Hot Rating (flame meter 1-5) when marking items as Watched
- Share via WhatsApp/native share
- Swipe left to delete
- Filter by type, genre, platform, friend, hot rating
- Detail modal with cast, director, synopsis, runtime/episodes
- Multi-list architecture: Shows (orange), Books (green), Podcasts (purple) - Shows active, others coming soon

## Project Structure
- `shared/schema.ts` - Database schema and types
- `shared/routes.ts` - API route definitions
- `server/routes.ts` - Express route handlers
- `server/storage.ts` - Database storage layer
- `server/tmdb.ts` - TMDB API integration
- `client/src/pages/Dashboard.tsx` - Main page
- `client/src/components/TitleCard.tsx` - Compact list card
- `client/src/components/AddTitleSheet.tsx` - Add title with TMDB search
- `client/src/components/HotRatingDialog.tsx` - Flame rating dialog
- `client/src/components/DetailModal.tsx` - Full detail view

## Color Theme
- Primary: Orange (hsl 24 100% 50%) - Shows theme
- Clean light/dark mode support
- Mobile-first responsive design

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `TMDB_API_KEY` - The Movie Database API key (required for search/auto-populate)
