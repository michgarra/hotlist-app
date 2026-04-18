import { db } from "./db";
import {
  recommendations,
  userProfiles,
  friends,
  type Recommendation,
  type InsertRecommendation,
  type UpdateRecommendationRequest,
  type UserProfile,
  type InsertUserProfile,
  type Friend,
  type InsertFriend,
} from "@shared/schema";
import { eq, desc, ilike, and, asc, sql } from "drizzle-orm";

export interface IStorage {
  getRecommendations(userId: string): Promise<Recommendation[]>;
  reorderRecommendations(userId: string, orderedIds: number[]): Promise<void>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation & { userId: string }): Promise<Recommendation>;
  updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  findDuplicateRecommendation(userId: string, title: string, type: string, tmdbId?: number | null): Promise<Recommendation | undefined>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile & { userId: string }): Promise<UserProfile>;
  updateUserProfile(id: number, updates: Partial<InsertUserProfile> & { userId: string }): Promise<UserProfile>;
  getFriends(userId: string): Promise<Friend[]>;
  createFriend(friend: InsertFriend & { userId: string }): Promise<Friend>;
  deleteFriend(id: number): Promise<void>;
  findFriendByName(userId: string, name: string): Promise<Friend | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return await db.select().from(recommendations)
      .where(eq(recommendations.userId, userId))
      .orderBy(
        sql`${recommendations.sortOrder} ASC NULLS FIRST`,
        desc(recommendations.createdAt)
      );
  }

  async reorderRecommendations(userId: string, orderedIds: number[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        db.update(recommendations)
          .set({ sortOrder: index })
          .where(and(eq(recommendations.id, id), eq(recommendations.userId, userId)))
      )
    );
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [item] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return item;
  }

  async createRecommendation(insertRecommendation: InsertRecommendation & { userId: string }): Promise<Recommendation> {
    const [item] = await db
      .insert(recommendations)
      .values(insertRecommendation)
      .returning();
    return item;
  }

  async updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation> {
    const finalUpdates = updates.status === "Watched"
      ? { ...updates, sortOrder: null }
      : updates;
    const [item] = await db
      .update(recommendations)
      .set(finalUpdates)
      .where(eq(recommendations.id, id))
      .returning();
    return item;
  }

  async deleteRecommendation(id: number): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.id, id));
  }

  async findDuplicateRecommendation(userId: string, title: string, type: string, tmdbId?: number | null): Promise<Recommendation | undefined> {
    if (tmdbId) {
      const [item] = await db.select().from(recommendations)
        .where(and(eq(recommendations.userId, userId), eq(recommendations.tmdbId, tmdbId)));
      if (item) return item;
    }
    const [item] = await db.select().from(recommendations)
      .where(and(
        eq(recommendations.userId, userId),
        ilike(recommendations.title, title),
        eq(recommendations.type, type)
      ));
    return item;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile & { userId: string }): Promise<UserProfile> {
    const [item] = await db.insert(userProfiles).values(profile).returning();
    return item;
  }

  async updateUserProfile(id: number, updates: Partial<InsertUserProfile> & { userId: string }): Promise<UserProfile> {
    const [item] = await db.update(userProfiles).set(updates).where(eq(userProfiles.id, id)).returning();
    return item;
  }

  async getFriends(userId: string): Promise<Friend[]> {
    return await db.select().from(friends)
      .where(eq(friends.userId, userId))
      .orderBy(friends.name);
  }

  async createFriend(friend: InsertFriend & { userId: string }): Promise<Friend> {
    const [item] = await db.insert(friends).values(friend).returning();
    return item;
  }

  async deleteFriend(id: number): Promise<void> {
    await db.delete(friends).where(eq(friends.id, id));
  }

  async findFriendByName(userId: string, name: string): Promise<Friend | undefined> {
    const [item] = await db.select().from(friends)
      .where(and(eq(friends.userId, userId), ilike(friends.name, name)));
    return item;
  }
}

export const storage = new DatabaseStorage();
