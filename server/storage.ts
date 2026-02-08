import { db } from "./db";
import {
  recommendations,
  userProfiles,
  type Recommendation,
  type InsertRecommendation,
  type UpdateRecommendationRequest,
  type UserProfile,
  type InsertUserProfile,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  getUserProfile(): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, updates: Partial<InsertUserProfile>): Promise<UserProfile>;
}

export class DatabaseStorage implements IStorage {
  async getRecommendations(): Promise<Recommendation[]> {
    return await db.select().from(recommendations).orderBy(desc(recommendations.createdAt));
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [item] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return item;
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const [item] = await db
      .insert(recommendations)
      .values(insertRecommendation)
      .returning();
    return item;
  }

  async updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation> {
    const [item] = await db
      .update(recommendations)
      .set(updates)
      .where(eq(recommendations.id, id))
      .returning();
    return item;
  }

  async deleteRecommendation(id: number): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.id, id));
  }

  async getUserProfile(): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).limit(1);
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [item] = await db.insert(userProfiles).values(profile).returning();
    return item;
  }

  async updateUserProfile(id: number, updates: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [item] = await db.update(userProfiles).set(updates).where(eq(userProfiles.id, id)).returning();
    return item;
  }
}

export const storage = new DatabaseStorage();
