import { db } from "./db";
import {
  recommendations,
  type Recommendation,
  type InsertRecommendation,
  type UpdateRecommendationRequest,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
