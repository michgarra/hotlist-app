import { test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { HOTLIST_QUERY } from "./hotlist";

test("Hotlist ranks real member ratings, not saves, and reflects edits", {
  skip: process.env.TEST_HOTLIST_DATABASE !== "1",
}, async () => {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Temporary table shadows recommendations only on this connection.
    // No real member records are read or modified.
    await client.query(`CREATE TEMP TABLE recommendations (
      id serial, user_id text, tmdb_id integer, title text, type text DEFAULT 'TV',
      genre text, poster_url text, imdb_rating real, rt_rating integer,
      overview text, hot_rating real, created_at timestamp DEFAULT NOW()
    ) ON COMMIT DROP`);
    const add = (user: string, tmdb: number, title: string, rating: number | null) =>
      client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating)
        VALUES ($1,$2,$3,$4)`, [user, tmdb, title, rating]);
    await add("one", 1, "Popular but lower rated", 3);
    await add("two", 1, "Popular but lower rated", 3);
    await add("three", 1, "Popular but lower rated", null);
    await add("one", 2, "Higher rated", 4.5);
    await add("one", 3, "More ratings wins tie", 4.5);
    await add("two", 3, "More ratings wins tie", 4.5);
    await add("one", 4, "Unrated", null);
    await add("one", 5, "Zero is not missing", 0);
    await add("one", 6, "Precise average", 4.51);
    await add("one", 7, "A stable alphabetical tie", 4.5);
    await add("one", 2, "Higher rated", 4.5); // Legacy duplicate.
    await add("one", 2, "Higher rated", null); // Must not erase their rating.
    await add("one", 8, "Old duplicate rating", 5);
    await add("one", 8, "Changed duplicate rating", 2);
    const rows = (await client.query(HOTLIST_QUERY)).rows;
    assert.deepEqual(rows.map(r => r.tmdb_id), [6, 3, 7, 2, 1, 8, 5, 4]);
    assert.equal(rows.find(r => r.tmdb_id === 2).hot_rating_count, 1);
    assert.equal(rows.find(r => r.tmdb_id === 2).user_count, 1);
    assert.equal(Number(rows.find(r => r.tmdb_id === 8).avg_hot_rating), 2);
    assert.equal(Number(rows.find(r => r.tmdb_id === 5).avg_hot_rating), 0);
    assert.equal(rows.find(r => r.tmdb_id === 4).avg_hot_rating, null);
    // Editing a rating changes the next result without restarting or a cache clear.
    await client.query("UPDATE recommendations SET hot_rating = 5 WHERE tmdb_id = 1");
    assert.equal((await client.query(HOTLIST_QUERY)).rows[0].tmdb_id, 1);
    await client.query("UPDATE recommendations SET hot_rating = NULL WHERE tmdb_id = 1");
    assert.equal((await client.query(HOTLIST_QUERY)).rows[0].tmdb_id, 6);
    await client.query("DELETE FROM recommendations WHERE tmdb_id = 6");
    assert.equal((await client.query(HOTLIST_QUERY)).rows[0].tmdb_id, 3);
    // The top-50 limit must be applied after ranking, not before it.
    await client.query(`INSERT INTO recommendations (user_id,tmdb_id,title,hot_rating)
      SELECT 'one', 100+n, 'Unrated filler ' || n, NULL FROM generate_series(1,60) n`);
    const limited = (await client.query(HOTLIST_QUERY)).rows;
    assert.equal(limited.length, 50);
    assert.equal(limited[0].tmdb_id, 3);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
