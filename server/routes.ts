import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertUserProfileSchema, insertFriendSchema } from "@shared/schema";
import { searchTmdb, getTmdbDetails, getTmdbSeasonCount } from "./tmdb";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.recommendations.list.path, async (_req, res) => {
    const items = await storage.getRecommendations();
    res.json(items);
  });

  app.get(api.recommendations.get.path, async (req, res) => {
    const item = await storage.getRecommendation(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

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

  app.post(api.recommendations.create.path, async (req, res) => {
    try {
      const input = api.recommendations.create.input.parse(req.body);
      const item = await storage.createRecommendation(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.patch(api.recommendations.update.path, async (req, res) => {
    try {
      const input = api.recommendations.update.input.parse(req.body);
      const existing = await storage.getRecommendation(Number(req.params.id));
      if (!existing) return res.status(404).json({ message: "Not found" });
      const item = await storage.updateRecommendation(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.delete(api.recommendations.delete.path, async (req, res) => {
    await storage.deleteRecommendation(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/profile", async (_req, res) => {
    const profile = await storage.getUserProfile();
    if (!profile) return res.status(404).json({ message: "No profile found" });
    res.json(profile);
  });

  app.post("/api/profile", async (req, res) => {
    try {
      const input = insertUserProfileSchema.parse(req.body);
      const existing = await storage.getUserProfile();
      if (existing) {
        const updated = await storage.updateUserProfile(existing.id, input);
        return res.json(updated);
      }
      const profile = await storage.createUserProfile(input);
      res.status(201).json(profile);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "Failed to save profile" });
    }
  });

  app.get("/api/friends", async (_req, res) => {
    const friendsList = await storage.getFriends();
    res.json(friendsList);
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const input = insertFriendSchema.parse(req.body);
      const existing = await storage.findFriendByName(input.name.trim());
      if (existing) {
        return res.status(409).json({ message: "Friend already exists", friend: existing });
      }
      const friend = await storage.createFriend({ name: input.name.trim() });
      res.status(201).json(friend);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "Failed to add friend" });
    }
  });

  app.delete("/api/friends/:id", async (req, res) => {
    await storage.deleteFriend(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.tmdb.search.path, async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    try {
      const results = await searchTmdb(query);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "TMDB search failed" });
    }
  });

  app.get(api.tmdb.details.path, async (req, res) => {
    const tmdbId = Number(req.params.id);
    const mediaType = (req.query.type as string) === "TV Show" ? "tv" : "movie";
    try {
      const details = await getTmdbDetails(tmdbId, mediaType);
      res.json(details);
    } catch (err: any) {
      res.status(404).json({ message: err.message || "Not found" });
    }
  });

  app.get("/api/recommendations/:id/check-new-season", async (req, res) => {
    try {
      const item = await storage.getRecommendation(Number(req.params.id));
      if (!item) return res.status(404).json({ message: "Not found" });
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

  async function seedDatabase() {
    const existingItems = await storage.getRecommendations();
    if (existingItems.length === 0) {
      await storage.createRecommendation({
        title: "Severance",
        type: "TV Show",
        genre: "Sci-Fi, Thriller",
        recommendedBy: "Sarah",
        platform: "Apple TV+",
        status: "Want to Watch",
        releaseDate: "2022-02-18",
        notes: "Mind-bending workplace thriller",
        posterUrl: "https://image.tmdb.org/t/p/w342/pA0YwGvbcIEVa9AMXV0xSFMRYmH.jpg",
        imdbRating: 8.7,
        seasons: 2,
        episodes: 19,
        overview: "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
        cast: "Adam Scott, Zach Cherry, Britt Lower, Tramell Tillman, Jen Tullock",
        director: "Ben Stiller",
      });
      await storage.createRecommendation({
        title: "Dune: Part Two",
        type: "Movie",
        genre: "Sci-Fi, Adventure",
        recommendedBy: "Mike",
        platform: "Max",
        status: "Watched",
        hotRating: 5,
        releaseDate: "2024-02-28",
        notes: "Visually stunning. Must see on big screen.",
        posterUrl: "https://image.tmdb.org/t/p/w342/czembW0Rk1Ke7lCJGahbOhdCuhV.jpg",
        imdbRating: 8.1,
        runtime: 166,
        overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, Paul endeavors to prevent a terrible future only he can foresee.",
        cast: "Timothee Chalamet, Zendaya, Austin Butler, Florence Pugh, Josh Brolin",
        director: "Denis Villeneuve",
      });
      await storage.createRecommendation({
        title: "The Bear",
        type: "TV Show",
        genre: "Drama, Comedy",
        recommendedBy: "Chef",
        platform: "Hulu",
        status: "Interested",
        releaseDate: "2022-06-23",
        notes: "Stressful but amazing cooking drama",
        posterUrl: "https://image.tmdb.org/t/p/w342/sHFlYJEpnPsl3IpsMiqSLOWRcTt.jpg",
        imdbRating: 8.6,
        seasons: 3,
        episodes: 28,
        overview: "Carmy, a young fine-dining chef, comes home to Chicago to run his family sandwich shop. As he fights to transform the shop and himself, he works alongside a rough-around-the-edges crew that ultimately reveal themselves as his chosen family.",
        cast: "Jeremy Allen White, Ayo Edebiri, Ebon Moss-Bachrach, Lionel Boyce, Liza Colon-Zayas",
        director: "Christopher Storer",
      });
      await storage.createRecommendation({
        title: "Civil War",
        type: "Movie",
        genre: "Action, Drama",
        recommendedBy: "Kerry",
        platform: "Netflix",
        status: "Want to Watch",
        releaseDate: "2024-04-10",
        notes: "Intense and thought-provoking",
        posterUrl: "https://image.tmdb.org/t/p/w342/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
        imdbRating: 6.8,
        runtime: 109,
        overview: "In the near future, a group of war journalists attempt to survive while reporting the truth as the United States stands on the brink of civil war. Navigating a dangerous cross-country journey from New York to Washington D.C., the team faces escalating tensions as they race to document the conflict before it consumes everything.",
        cast: "Kirsten Dunst, Wagner Moura, Cailee Spaeny, Stephen McKinley Henderson, Jesse Plemons",
        director: "Alex Garland",
      });
    }
  }

  seedDatabase().catch(console.error);

  return httpServer;
}
