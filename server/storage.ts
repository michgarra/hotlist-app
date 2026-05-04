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

export interface AdminUserRow {
  userId: string;
  name: string;
  ageRange: string;
  streamingApps: string[];
  joinedAt: Date | null;
  totalTitles: number;
  watching: number;
  watched: number;
  tagged: number;
  reviewed: number;
  friends: number;
  lastAdded: Date | null;
}

export interface AdminStats {
  totalUsers: number;
  totalTitles: number;
  totalWatched: number;
  totalTagged: number;
  totalReviewed: number;
  avgListSize: number;
  users: AdminUserRow[];
  topTitles: { title: string; posterUrl: string | null; type: string; userCount: number }[];
  topTags: { tag: string; count: number }[];
  weeklyAdded: { week: string; count: number }[];
  genreBreakdown: { genre: string; count: number }[];
}

export interface IStorage {
  getRecommendations(userId: string): Promise<Recommendation[]>;
  reorderRecommendations(userId: string, orderedIds: number[]): Promise<void>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation & { userId: string }): Promise<Recommendation>;
  updateRecommendation(id: number, updates: UpdateRecommendationRequest): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  findDuplicateRecommendation(userId: string, title: string, type: string, tmdbId?: number | null): Promise<Recommendation | undefined>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  getProfileByListToken(token: string): Promise<UserProfile | undefined>;
  ensureListToken(userId: string): Promise<string>;
  createUserProfile(profile: InsertUserProfile & { userId: string }): Promise<UserProfile>;
  updateUserProfile(id: number, updates: Partial<InsertUserProfile> & { userId: string }): Promise<UserProfile>;
  getFriends(userId: string): Promise<Friend[]>;
  createFriend(friend: InsertFriend & { userId: string }): Promise<Friend>;
  deleteFriend(id: number): Promise<void>;
  findFriendByName(userId: string, name: string): Promise<Friend | undefined>;
  getPopularTags(tmdbIds: number[]): Promise<Record<number, string[]>>;
  getCommunityData(tmdbId: number): Promise<{ tags: { tag: string; count: number }[]; reviews: { text: string; author: string }[] }>;
  getAdminStats(): Promise<AdminStats>;
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

  async getProfileByListToken(token: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.listToken, token))
      .limit(1);
    return profile;
  }

  async ensureListToken(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.listToken) return profile.listToken;
    const token = crypto.randomUUID();
    await db.update(userProfiles).set({ listToken: token }).where(eq(userProfiles.userId, userId));
    return token;
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

  async getCommunityData(tmdbId: number): Promise<{ tags: { tag: string; count: number }[]; reviews: { text: string; author: string }[] }> {
    const rows = await db.execute(
      sql`SELECT r.watch_tags, r.watch_review, p.name
          FROM recommendations r
          LEFT JOIN user_profiles p ON p.user_id = r.user_id
          WHERE r.tmdb_id = ${tmdbId}
            AND (r.watch_tags IS NOT NULL OR r.watch_review IS NOT NULL)`
    );

    const tagCounts: Record<string, number> = {};
    const reviews: { text: string; author: string }[] = [];

    for (const row of rows.rows as any[]) {
      if (row.watch_tags) {
        for (const tag of String(row.watch_tags).split(",").map((t: string) => t.trim()).filter(Boolean)) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
      if (row.watch_review) {
        const firstName = row.name ? String(row.name).split(" ")[0] : "A Hotlister";
        reviews.push({ text: String(row.watch_review), author: firstName });
      }
    }

    const tags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    return { tags, reviews };
  }

  async getPopularTags(tmdbIds: number[]): Promise<Record<number, string[]>> {
    if (!tmdbIds.length) return {};
    const idsLiteral = `{${tmdbIds.map(Number).join(",")}}`;
    const result = await db.execute(
      sql`SELECT tmdb_id, tag, COUNT(*) as cnt
          FROM recommendations,
               unnest(string_to_array(watch_tags, ', ')) as tag
          WHERE tmdb_id = ANY(${idsLiteral}::int[])
            AND watch_tags IS NOT NULL
          GROUP BY tmdb_id, tag
          ORDER BY tmdb_id, cnt DESC`
    );
    const map: Record<number, string[]> = {};
    for (const row of result.rows as any[]) {
      const id = Number(row.tmdb_id);
      if (!map[id]) map[id] = [];
      if (map[id].length < 3) map[id].push(row.tag);
    }
    return map;
  }

  async getAdminStats(): Promise<AdminStats> {
    const [userStats, titleStats, topTitlesRes, topTagsRes, weeklyRes, genreRes, friendCounts] = await Promise.all([
      // Per-user breakdown joined with profiles
      db.execute(sql`
        SELECT
          p.user_id,
          p.name,
          p.age_range,
          p.streaming_apps,
          p.created_at as joined_at,
          COUNT(r.id) as total_titles,
          COUNT(r.id) FILTER (WHERE r.status = 'Watching') as watching,
          COUNT(r.id) FILTER (WHERE r.status = 'Watched') as watched,
          COUNT(r.id) FILTER (WHERE r.watch_tags IS NOT NULL) as tagged,
          COUNT(r.id) FILTER (WHERE r.watch_review IS NOT NULL AND r.watch_review != '') as reviewed,
          MAX(r.created_at) as last_added
        FROM user_profiles p
        LEFT JOIN recommendations r ON r.user_id = p.user_id
        GROUP BY p.user_id, p.name, p.age_range, p.streaming_apps, p.created_at
        ORDER BY p.created_at DESC
      `),
      // Totals
      db.execute(sql`
        SELECT
          COUNT(DISTINCT user_id) as total_users,
          COUNT(*) as total_titles,
          COUNT(*) FILTER (WHERE status = 'Watched') as total_watched,
          COUNT(*) FILTER (WHERE watch_tags IS NOT NULL) as total_tagged,
          COUNT(*) FILTER (WHERE watch_review IS NOT NULL AND watch_review != '') as total_reviewed
        FROM recommendations
      `),
      // Top titles by user count
      db.execute(sql`
        SELECT title, poster_url, type, COUNT(DISTINCT user_id) as user_count
        FROM recommendations
        WHERE tmdb_id IS NOT NULL
        GROUP BY title, poster_url, type
        ORDER BY user_count DESC
        LIMIT 10
      `),
      // Top tags
      db.execute(sql`
        SELECT tag, COUNT(*) as count
        FROM recommendations,
             unnest(string_to_array(watch_tags, ', ')) as tag
        WHERE watch_tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 15
      `),
      // Weekly activity (last 8 weeks)
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('week', created_at), 'DD Mon') as week,
          COUNT(*) as count
        FROM recommendations
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY DATE_TRUNC('week', created_at)
      `),
      // Genre breakdown
      db.execute(sql`
        SELECT
          TRIM(genre_part) as genre,
          COUNT(*) as count
        FROM recommendations,
             unnest(string_to_array(genre, ', ')) as genre_part
        WHERE genre IS NOT NULL
        GROUP BY TRIM(genre_part)
        ORDER BY count DESC
        LIMIT 10
      `),
      // Friend counts per user
      db.execute(sql`
        SELECT user_id, COUNT(*) as friend_count
        FROM friends
        GROUP BY user_id
      `),
    ]);

    const friendMap: Record<string, number> = {};
    for (const row of friendCounts.rows as any[]) {
      friendMap[row.user_id] = Number(row.friend_count);
    }

    const totals = (titleStats.rows[0] as any) || {};

    const users: AdminUserRow[] = (userStats.rows as any[]).map(r => ({
      userId: r.user_id,
      name: r.name,
      ageRange: r.age_range,
      streamingApps: r.streaming_apps || [],
      joinedAt: r.joined_at ? new Date(r.joined_at) : null,
      totalTitles: Number(r.total_titles),
      watching: Number(r.watching),
      watched: Number(r.watched),
      tagged: Number(r.tagged),
      reviewed: Number(r.reviewed),
      friends: friendMap[r.user_id] || 0,
      lastAdded: r.last_added ? new Date(r.last_added) : null,
    }));

    const totalUsers = users.length;
    const totalTitles = Number(totals.total_titles || 0);

    return {
      totalUsers,
      totalTitles,
      totalWatched: Number(totals.total_watched || 0),
      totalTagged: Number(totals.total_tagged || 0),
      totalReviewed: Number(totals.total_reviewed || 0),
      avgListSize: totalUsers > 0 ? Math.round(totalTitles / totalUsers) : 0,
      users,
      topTitles: (topTitlesRes.rows as any[]).map(r => ({
        title: r.title,
        posterUrl: r.poster_url,
        type: r.type,
        userCount: Number(r.user_count),
      })),
      topTags: (topTagsRes.rows as any[]).map(r => ({
        tag: r.tag,
        count: Number(r.count),
      })),
      weeklyAdded: (weeklyRes.rows as any[]).map(r => ({
        week: r.week,
        count: Number(r.count),
      })),
      genreBreakdown: (genreRes.rows as any[]).map(r => ({
        genre: r.genre,
        count: Number(r.count),
      })),
    };
  }
}

export const storage = new DatabaseStorage();
