import { pgTable, text, serial, timestamp, integer, real, varchar, index, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
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
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("friends_user_id_idx").on(table.userId),
]);

export const insertFriendSchema = createInsertSchema(friends).omit({
  id: true,
  userId: true,
  createdAt: true,
  aliases: true,
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
  hotRatedAt: timestamp("hot_rated_at", { withTimezone: true }),
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
  censorRating: text("censor_rating"),
  watchWith: text("watch_with"),
  watchTags: text("watch_tags"),
  watchReview: text("watch_review"),
  sortOrder: integer("sort_order"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  watchedAt: timestamp("watched_at"),
  nextSeasonDate: text("next_season_date"),
  seriesHistory: jsonb("series_history").$type<{ watchedAt: string; seasons: number | null; rating: number | null; review: string | null; alertsAcknowledgedAt?: string }[]>().notNull().default([]),
  dismissedSeriesAlerts: text("dismissed_series_alerts").array().notNull().default(sql`'{}'::text[]`),
}, (table) => [
  index("recommendations_user_id_idx").on(table.userId),
]);

export const loginEvents = pgTable("login_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  loginAt: timestamp("login_at").defaultNow().notNull(),
}, (table) => [
  index("login_events_user_id_idx").on(table.userId),
  index("login_events_login_at_idx").on(table.loginAt),
]);

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  userId: true,
  createdAt: true,
  hotRatedAt: true,
  seriesHistory: true,
  dismissedSeriesAlerts: true,
}).extend({
  hotRating: z.number().min(0).max(5).nullable().optional(),
  nextSeasonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date").nullable().optional(),
});

export const seriesCatalog = pgTable("series_catalog", {
  tmdbId: integer("tmdb_id").primaryKey(),
  seasons: jsonb("seasons").$type<{ season: number; date: string | null }[]>().notNull().default([]),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type CreateRecommendationRequest = InsertRecommendation;
export type UpdateRecommendationRequest = Partial<InsertRecommendation>;
