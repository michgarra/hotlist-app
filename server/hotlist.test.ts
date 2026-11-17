import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { HOTLIST_QUERY } from "./hotlist";
import { ratingDate } from "./rating-date";
import { randomUUID } from "node:crypto";
import { insertRecommendationSchema } from "../shared/schema";

test("rating dates change only on an actual rating change", () => {
  const old = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-11-17T00:00:00Z");
  assert.equal(ratingDate(4, 4, old, now), old);
  assert.equal(ratingDate(4, 4, null, now), null); // Do not invent a legacy date.
  assert.equal(ratingDate(null, 4, null, now), now);
  assert.equal(ratingDate(4, 5, old, now), now);
  assert.equal(ratingDate(4, null, old, now), null);
  assert.equal(ratingDate(null, 0, null, now), now);
  const payload = insertRecommendationSchema.partial().parse({
    hotRating: 4, hotRatedAt: now.toISOString(),
  });
  assert.ok(!("hotRatedAt" in payload)); // Clients cannot manufacture recency.
  assert.equal(insertRecommendationSchema.partial().safeParse({ hotRating: 6 }).success, false);
  assert.equal(insertRecommendationSchema.partial().safeParse({ hotRating: -1 }).success, false);
});

test("real title saves capture rating changes but do not refresh unchanged legacy ratings", {
  skip: process.env.TEST_HOTLIST_DATABASE !== "1",
}, async () => {
  const { storage } = await import("./storage");
  const { pool } = await import("./db");
  const userId = `rating-test-${randomUUID()}`;
  try {
    const item = await storage.createRecommendation({
      userId, title: "Synthetic rating timestamp test", type: "Movie", status: "Watched", hotRating: 4,
    });
    assert.ok(item.hotRatedAt instanceof Date);
    const saved = await storage.updateRecommendation(item.id, { notes: "Keep my notes" });
    assert.equal(saved.hotRatedAt?.getTime(), item.hotRatedAt?.getTime());
    await pool.query("UPDATE recommendations SET hot_rated_at=NULL WHERE user_id=$1", [userId]);
    const legacy = await storage.updateRecommendation(item.id, { hotRating: 4 });
    assert.equal(legacy.hotRatedAt, null);
    const changed = await storage.updateRecommendation(item.id, { hotRating: 4.5 });
    assert.ok(changed.hotRatedAt instanceof Date);
    const again = await storage.updateRecommendation(item.id, { hotRating: 4.5, archived: true });
    assert.equal(again.hotRatedAt?.getTime(), changed.hotRatedAt?.getTime());
    const cleared = await storage.updateRecommendation(item.id, { hotRating: null });
    assert.equal(cleared.hotRatedAt, null);
    assert.equal(cleared.notes, "Keep my notes");
  } finally {
    await pool.query("DELETE FROM recommendations WHERE user_id=$1", [userId]);
    await pool.end();
  }
});

test("Hotlist combines average, participation, time decay and two-rating eligibility", {
  skip: process.env.TEST_HOTLIST_DATABASE !== "1",
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE recommendations (
      id serial, user_id text, tmdb_id integer, title text, type text DEFAULT 'TV',
      genre text, poster_url text, imdb_rating real, rt_rating integer,
      overview text, hot_rating real, created_at timestamp DEFAULT NOW(),
      hot_rated_at timestamptz
    ) ON COMMIT DROP`);
    const add = async (id: number, title: string, rating: number | null, raters: number, days: number | null) => {
      for (let i = 0; i < raters; i++) {
        await client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating,hot_rated_at)
          VALUES ($1,$2,$3,$4,CASE WHEN $5::int IS NULL THEN NULL ELSE NOW()-make_interval(days=>$5) END)`,
        [`member-${i}`, id, title, rating, days]);
      }
    };
    await add(1, "Broad support", 4.7, 20, 0);
    await add(2, "Small sample", 4.8, 2, 0);
    await add(3, "Single five", 5, 1, 0);
    await add(4, "Unrated", null, 4, null);
    await add(5, "Half-life", 4.7, 20, 30);
    await add(6, "Older favourite", 5, 20, 180);
    await add(7, "Unknown rating dates", 5, 20, null);
    await add(8, "Zero is a rating", 0, 2, 0);
    await add(9, "Future dates are clamped", 4.7, 20, -10);
    // Duplicate from the same member is not an extra vote.
    await client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating,hot_rated_at)
      VALUES ('member-0', 2, 'Small sample',4.8,NOW()), ('member-0',2,'Small sample',NULL,NULL)`);
    const rows = (await client.query(HOTLIST_QUERY)).rows;
    const row = (id: number) => rows.find(r => r.tmdb_id === id);
    assert.equal(row(1).hot_rating_count, 20);
    assert.equal(row(2).hot_rating_count, 2);
    assert.equal(row(2).user_count, 2);
    assert.equal(Number(row(1).avg_hot_rating), 4.7);
    assert.equal(Number(row(2).avg_hot_rating), 4.8);
    assert.ok(Number(row(1).trending_score) > Number(row(2).trending_score));
    assert.ok(Number(row(2).trending_score) > Number(row(6).trending_score));
    assert.equal(Number(row(5).trending_score) / Number(row(1).trending_score), 0.5);
    assert.equal(Number(row(9).trending_score), Number(row(1).trending_score));
    assert.equal(row(7).dated_rating_count, 0);
    assert.equal(Number(row(7).trending_score), 0);
    assert.equal(Number(row(7).avg_hot_rating), 5);
    assert.equal(row(3).section, "early");
    assert.equal(row(8).section, "ranked");
    assert.equal(row(8).hot_rating_count, 2);
    assert.ok(!row(4));
    assert.deepEqual(rows.filter(r=>r.section === "ranked").map(r=>Number(r.section_position)),
      Array.from({length: 7}, (_,i)=>i+1));
    assert.equal(rows[rows.length-1].tmdb_id, 3);

    // A second member's rating promotes a title from Early ratings.
    await client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating,hot_rated_at)
      VALUES ('second-member',3,'Single five',5,NOW())`);
    let changed = (await client.query(HOTLIST_QUERY)).rows.find(r=>r.tmdb_id === 3);
    assert.equal(changed.section, "ranked");
    assert.equal(changed.hot_rating_count, 2);
    // Clearing or deleting ratings immediately affects eligibility.
    await client.query("UPDATE recommendations SET hot_rating=NULL,hot_rated_at=NULL WHERE tmdb_id=3 AND user_id='second-member'");
    changed = (await client.query(HOTLIST_QUERY)).rows.find(r=>r.tmdb_id === 3);
    assert.equal(changed.section, "early");
    await client.query("DELETE FROM recommendations WHERE tmdb_id=3");
    assert.ok(!(await client.query(HOTLIST_QUERY)).rows.some(r=>r.tmdb_id === 3));
    // Let time pass without changing the average.
    await client.query("UPDATE recommendations SET hot_rated_at=hot_rated_at-INTERVAL '30 days' WHERE tmdb_id=1");
    const aged = (await client.query(HOTLIST_QUERY)).rows.find(r=>r.tmdb_id === 1);
    assert.equal(Number(aged.trending_score) / Number(row(1).trending_score), 0.5);
    assert.equal(Number(aged.avg_hot_rating), 4.7);
    // Separate limits: plentiful early ratings cannot displace the main chart.
    await client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating,hot_rated_at)
      SELECT 'member-0',100+n,'Early filler ' || n,5,NOW() FROM generate_series(1,60) n`);
    const limited = (await client.query(HOTLIST_QUERY)).rows;
    assert.equal(limited.filter(r=>r.section === "early").length, 50);
    assert.equal(limited.filter(r=>r.section === "ranked").length, 7);
    await client.query("DELETE FROM recommendations");
    assert.equal((await client.query(HOTLIST_QUERY)).rowCount, 0);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
