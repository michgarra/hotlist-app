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
import { eq, desc, ilike } from "drizzle-orm";

export interface IStorage {
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  getUserProfile(): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: number, updates: Partial<InsertUserProfile>): Promise<UserProfile>;
  getFriends(): Promise<Friend[]>;
  createFriend(friend: InsertFriend): Promise<Friend>;
  deleteFriend(id: number): Promise<void>;
  findFriendByName(name: string): Promise<Friend | undefined>;
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

  async getFriends(): Promise<Friend[]> {
    return await db.select().from(friends).orderBy(friends.name);
  }

  async createFriend(friend: InsertFriend): Promise<Friend> {
    const [item] = await db.insert(friends).values(friend).returning();
    return item;
  }

  async deleteFriend(id: number): Promise<void> {
    await db.delete(friends).where(eq(friends.id, id));
  }

  async findFriendByName(name: string): Promise<Friend | undefined> {
    const [item] = await db.select().from(friends).where(ilike(friends.name, name));
    return item;
  }
}

export const storage = new DatabaseStorage();
