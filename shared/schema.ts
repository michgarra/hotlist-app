import { pgTable, text, serial, timestamp, integer, real, varchar, index, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  ageRange: text("age_range").notNull(),
  streamingApps: text("streaming_apps").array().notNull(),
  preferredRating: text("preferred_rating").notNull().default("imdb"),
  listToken: varchar("list_token", { length: 36 }).default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_profiles_user_id_idx").on(table.userId),
]);

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("friends_user_id_idx").on(table.userId),
]);

export const insertFriendSchema = createInsertSchema(friends).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  genre: text("genre"),
  recommendedBy: text("recommended_by"),
  platform: text("platform"),
  status: text("status").notNull().default("Want to Watch"),
  notes: text("notes"),
  hotRating: real("hot_rating"),
  tmdbId: integer("tmdb_id"),
  posterUrl: text("poster_url"),
  imdbRating: real("imdb_rating"),
  rtRating: integer("rt_rating"),
  overview: text("overview"),
  releaseDate: text("release_date"),
  runtime: integer("runtime"),
  seasons: integer("seasons"),
  episodes: integer("episodes"),
  lastKnownSeasons: integer("last_known_seasons"),
  cast: text("cast_list"),
  director: text("director"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("recommendations_user_id_idx").on(table.userId),
]);

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type CreateRecommendationRequest = InsertRecommendation;
export type UpdateRecommendationRequest = Partial<InsertRecommendation>;
