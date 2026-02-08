import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  genre: text("genre"),
  recommendedBy: text("recommended_by"),
  platform: text("platform"),
  status: text("status").notNull().default("Want to Watch"),
  notes: text("notes"),
  hotRating: integer("hot_rating"),
  tmdbId: integer("tmdb_id"),
  posterUrl: text("poster_url"),
  imdbRating: real("imdb_rating"),
  rtRating: integer("rt_rating"),
  overview: text("overview"),
  releaseDate: text("release_date"),
  runtime: integer("runtime"),
  seasons: integer("seasons"),
  episodes: integer("episodes"),
  cast: text("cast_list"),
  director: text("director"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type CreateRecommendationRequest = InsertRecommendation;
export type UpdateRecommendationRequest = Partial<InsertRecommendation>;
