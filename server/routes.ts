import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
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
      const results = await searchTmdb(query);
      res.json(results);
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

  return httpServer;
}
