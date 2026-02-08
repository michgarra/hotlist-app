import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'Movie' or 'TV Show'
  genre: text("genre"),
  recommendedBy: text("recommended_by"),
  platform: text("platform"), // Netflix, HBO, etc.
  status: text("status").notNull().default("To Watch"), // 'To Watch', 'Watched'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

// API Types
export type CreateRecommendationRequest = InsertRecommendation;
export type UpdateRecommendationRequest = Partial<InsertRecommendation>;
