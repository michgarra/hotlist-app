import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.recommendations.list.path, async (req, res) => {
    const items = await storage.getRecommendations();
    res.json(items);
  });

  app.get(api.recommendations.get.path, async (req, res) => {
    const item = await storage.getRecommendation(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Recommendation not found" });
    }
    res.json(item);
  });

  app.post(api.recommendations.create.path, async (req, res) => {
    try {
      const input = api.recommendations.create.input.parse(req.body);
      const item = await storage.createRecommendation(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.patch(api.recommendations.update.path, async (req, res) => {
    try {
      const input = api.recommendations.update.input.parse(req.body);
      const item = await storage.updateRecommendation(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.delete(api.recommendations.delete.path, async (req, res) => {
    await storage.deleteRecommendation(Number(req.params.id));
    res.status(204).send();
  });

  // Seed data function (optional, can be called on startup)
  async function seedDatabase() {
    const existingItems = await storage.getRecommendations();
    if (existingItems.length === 0) {
      await storage.createRecommendation({
        title: "Severance",
        type: "TV Show",
        genre: "Sci-Fi/Thriller",
        recommendedBy: "Sarah",
        platform: "Apple TV+",
        status: "To Watch",
        notes: "Supposed to be mind-bending!",
      });
      await storage.createRecommendation({
        title: "Dune: Part Two",
        type: "Movie",
        genre: "Sci-Fi",
        recommendedBy: "Mike",
        platform: "Cinema",
        status: "Watched",
        notes: "Visually stunning. Must see on big screen.",
      });
      await storage.createRecommendation({
        title: "The Bear",
        type: "TV Show",
        genre: "Drama/Comedy",
        recommendedBy: "Chef",
        platform: "Hulu",
        status: "To Watch",
        notes: "Stressful but amazing.",
      });
    }
  }

  // Run seed
  seedDatabase().catch(console.error);

  return httpServer;
}
