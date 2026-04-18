import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertUserProfileSchema, insertFriendSchema } from "@shared/schema";
import { searchTmdb, getTmdbDetails, getTmdbSeasonCount } from "./tmdb";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/shared/:id", async (req, res) => {
    const item = await storage.getRecommendation(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json({
      id: item.id,
      title: item.title,
      type: item.type,
      genre: item.genre,
      platform: item.platform,
      posterUrl: item.posterUrl,
      imdbRating: item.imdbRating,
      overview: item.overview,
      releaseDate: item.releaseDate,
      runtime: item.runtime,
      seasons: item.seasons,
      episodes: item.episodes,
      cast: item.cast,
      director: item.director,
      tmdbId: item.tmdbId,
    });
  });

  app.get("/api/hotlist", isAuthenticated, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          tmdb_id,
          MAX(title) AS title,
          MAX(type) AS type,
          MAX(genre) AS genre,
          MAX(poster_url) AS poster_url,
          MAX(imdb_rating) AS imdb_rating,
          MAX(rt_rating) AS rt_rating,
          MAX(overview) AS overview,
          COUNT(DISTINCT user_id)::int AS user_count,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)::int AS recent_count,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '14 days' AND created_at <= NOW() - INTERVAL '7 days' THEN 1 END)::int AS prev_count
        FROM recommendations
        WHERE tmdb_id IS NOT NULL
        GROUP BY tmdb_id
        ORDER BY user_count DESC, recent_count DESC
        LIMIT 50
      `);
      const rows = result.rows.map((row: any, index: number) => {
        let trend: "up" | "down" | "stable" = "stable";
        if (row.recent_count > row.prev_count) trend = "up";
        else if (row.recent_count < row.prev_count) trend = "down";
        return {
          rank: index + 1,
          tmdbId: row.tmdb_id,
          title: row.title,
          type: row.type,
          genre: row.genre,
          posterUrl: row.poster_url,
          imdbRating: row.imdb_rating,
          rtRating: row.rt_rating,
          overview: row.overview,
          userCount: row.user_count,
          trend,
        };
      });
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch hotlist" });
    }
  });

  app.post("/api/recommendations/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
      await storage.reorderRecommendations(userId, orderedIds);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.recommendations.list.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const items = await storage.getRecommendations(userId);
    res.json(items);
  });

  app.get(api.recommendations.get.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const item = await storage.getRecommendation(Number(req.params.id));
    if (!item || item.userId !== userId) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post(api.recommendations.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = api.recommendations.create.input.parse(req.body);

      const duplicate = await storage.findDuplicateRecommendation(userId, parsed.title, parsed.type, parsed.tmdbId);
      if (duplicate) {
        return res.status(409).json({ message: `"${parsed.title}" is already in your list`, existing: duplicate });
      }

      const item = await storage.createRecommendation({ ...parsed, userId });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.patch(api.recommendations.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const input = api.recommendations.update.input.parse(req.body);
      const existing = await storage.getRecommendation(Number(req.params.id));
      if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
      const item = await storage.updateRecommendation(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.recommendations.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const existing = await storage.getRecommendation(Number(req.params.id));
    if (!existing || existing.userId !== userId) return res.status(404).json({ message: "Not found" });
    await storage.deleteRecommendation(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const profile = await storage.getUserProfile(userId);
    if (!profile) return res.status(404).json({ message: "No profile found" });
    res.json(profile);
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertUserProfileSchema.parse(req.body);
      const existing = await storage.getUserProfile(userId);
      if (existing) {
        const updated = await storage.updateUserProfile(existing.id, { ...parsed, userId });
        return res.json(updated);
      }
      const profile = await storage.createUserProfile({ ...parsed, userId });
      res.status(201).json(profile);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "Failed to save profile" });
    }
  });

  app.get("/api/friends", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const friendsList = await storage.getFriends(userId);
    res.json(friendsList);
  });

  app.post("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const parsed = insertFriendSchema.parse(req.body);
      const existing = await storage.findFriendByName(userId, parsed.name.trim());
      if (existing) {
        return res.status(409).json({ message: "Friend already exists", friend: existing });
      }
      const friend = await storage.createFriend({ ...parsed, name: parsed.name.trim(), userId });
      res.status(201).json(friend);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "Failed to add friend" });
    }
  });

  app.delete("/api/friends/:id", isAuthenticated, async (req, res) => {
    await storage.deleteFriend(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.tmdb.search.path, isAuthenticated, async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    try {
      // Build an alternate query to handle one-word vs two-word title variants
      // e.g. "Black Shore" also searches "Blackshore", and "Blackshore" also tries "Black shore"
      const altQuery = query.includes(" ")
        ? query.replace(/ /g, "")          // "Black Shore" → "Blackshore"
        : query.replace(/([a-z])([A-Z])/g, "$1 $2"); // camelCase split (bonus)

      const searches: Promise<any[]>[] = [searchTmdb(query)];
      if (altQuery !== query) searches.push(searchTmdb(altQuery));

      const [primary, secondary = []] = await Promise.all(searches);

      // Merge, deduplicating by TMDB id — primary results first
      const seen = new Set(primary.map((r: any) => r.id));
      const merged = [...primary, ...secondary.filter((r: any) => !seen.has(r.id))];

      res.json(merged);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "TMDB search failed" });
    }
  });

  app.get(api.tmdb.details.path, isAuthenticated, async (req, res) => {
    const tmdbId = Number(req.params.id);
    const mediaType = (req.query.type as string) === "TV Show" ? "tv" : "movie";
    try {
      const details = await getTmdbDetails(tmdbId, mediaType);
      res.json(details);
    } catch (err: any) {
      res.status(404).json({ message: err.message || "Not found" });
    }
  });

  app.get("/api/recommendations/:id/check-new-season", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const item = await storage.getRecommendation(Number(req.params.id));
      if (!item || item.userId !== userId) return res.status(404).json({ message: "Not found" });
      if (item.type !== "TV Show") return res.status(400).json({ message: "Not a TV show" });
      if (!item.tmdbId) return res.status(400).json({ message: "No TMDB ID" });

      const current = await getTmdbSeasonCount(item.tmdbId);
      const lastKnown = item.lastKnownSeasons || item.seasons || 0;
      const hasNewSeason = current.seasons > lastKnown;

      await storage.updateRecommendation(item.id, {
        seasons: current.seasons,
        episodes: current.episodes,
        lastKnownSeasons: hasNewSeason ? lastKnown : current.seasons,
      });

      res.json({
        hasNewSeason,
        currentSeasons: current.seasons,
        lastKnownSeasons: lastKnown,
        currentEpisodes: current.episodes,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to check seasons" });
    }
  });

  // List sharing routes
  app.get("/api/me/list-token", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const token = await storage.ensureListToken(userId);
      res.json({ token, url: `${req.protocol}://${req.get("host")}/list/${token}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get list token" });
    }
  });

  app.get("/api/public-list/:token", async (req, res) => {
    try {
      const owner = await storage.getProfileByListToken(String(req.params.token));
      if (!owner) return res.status(404).json({ message: "List not found" });
      const items = await storage.getRecommendations(owner.userId);
      const visible = items.filter(i => i.status !== "Watched");
      res.json({ ownerName: owner.name, items: visible });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to load list" });
    }
  });

  app.post("/api/public-list/:token/add", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { itemId } = z.object({ itemId: z.number() }).parse(req.body);
      const owner = await storage.getProfileByListToken(String(req.params.token));
      if (!owner) return res.status(404).json({ message: "List not found" });
      const source = await storage.getRecommendation(itemId);
      if (!source || source.userId !== owner.userId) return res.status(404).json({ message: "Item not found" });
      const dupe = await storage.findDuplicateRecommendation(userId, source.title, source.type, source.tmdbId);
      if (dupe) return res.status(409).json({ message: "Already in your list" });
      const created = await storage.createRecommendation({
        userId,
        title: source.title,
        type: source.type,
        genre: source.genre,
        platform: source.platform,
        status: "Want to Watch",
        recommendedBy: owner.name,
        tmdbId: source.tmdbId,
        posterUrl: source.posterUrl,
        imdbRating: source.imdbRating,
        rtRating: source.rtRating,
        overview: source.overview,
        releaseDate: source.releaseDate,
        runtime: source.runtime,
        seasons: source.seasons,
        episodes: source.episodes,
        cast: source.cast,
        director: source.director,
        notes: null,
        hotRating: null,
        sortOrder: null,
        lastKnownSeasons: source.lastKnownSeasons,
      });
      res.json(created);
    } catch (err: any) {
      if (err.status === 409) return res.status(409).json({ message: "Already in your list" });
      res.status(500).json({ message: err.message || "Failed to add item" });
    }
  });

  app.post("/api/recommendations/:id/refresh-metadata", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const item = await storage.getRecommendation(Number(req.params.id));
      if (!item || item.userId !== userId) return res.status(404).json({ message: "Not found" });
      if (!item.tmdbId) return res.status(400).json({ message: "No TMDB ID stored for this title" });

      const mediaType = item.type === "Movie" ? "movie" : "tv";
      const details = await getTmdbDetails(item.tmdbId, mediaType);

      const updated = await storage.updateRecommendation(item.id, {
        imdbRating: details.imdbRating,
        overview: details.overview || item.overview,
        cast: details.cast.join(", ") || item.cast,
        director: details.director || item.director,
        runtime: details.runtime ?? item.runtime,
        seasons: details.seasons ?? item.seasons,
        episodes: details.episodes ?? item.episodes,
        genre: details.genres.join(", ") || item.genre,
        platform: details.platform || item.platform,
        posterUrl: details.posterUrl || item.posterUrl,
        releaseDate: details.releaseDate || item.releaseDate,
        censorRating: details.censorRating || item.censorRating,
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to refresh metadata" });
    }
  });

  return httpServer;
}
