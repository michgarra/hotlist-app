import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PeopleRepository } from "./people";

test("people merges preserve history, isolate accounts, persist aliases and serialize duplicate saves", {
  skip: process.env.TEST_PEOPLE_DATABASE !== "1",
}, async () => {
  const schema = `people_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema}`,
  });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await pool.query(`CREATE TABLE friends (
      id serial PRIMARY KEY, user_id text NOT NULL, name text NOT NULL,
      aliases text[] NOT NULL DEFAULT '{}', created_at timestamp DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE recommendations (
      id serial PRIMARY KEY, user_id text NOT NULL, title text,
      recommended_by text, watch_with text, hot_rating real,
      watched_at timestamp, notes text
    )`);
    const repo = new PeopleRepository(pool);
    const concurrent = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      repo.create("account-a", i % 2 ? "  Alex   Smith " : "alex smith")
    ));
    assert.equal(new Set(concurrent.map(p => p.id)).size, 1);
    await repo.create("account-a", "Alexander Smith");
    await repo.create("account-b", "Alexander Smith");
    await pool.query(`INSERT INTO recommendations
      (user_id,title,recommended_by,watch_with,hot_rating,watched_at,notes) VALUES
      ('account-a','First','Alexander Smith','Alexander Smith and Jamie, ALEX SMITH',4.5,'2026-01-01','Keep this'),
      ('account-a','Second',NULL,'Alexa, Alexander Smith',3,'2026-01-02','Keep too'),
      ('account-b','Other','Alexander Smith','Alexander Smith and Jamie',5,'2026-01-03','Other account')`);
    const before = (await pool.query("SELECT * FROM recommendations ORDER BY id")).rows;
    const preview = await repo.merge("account-a", "Alex Smith", ["Alexander Smith"], true);
    assert.equal(preview.friendsCombined, 2);
    assert.equal(preview.titlesUpdated, 2);
    assert.deepEqual((await pool.query("SELECT * FROM recommendations ORDER BY id")).rows, before);
    assert.equal((await pool.query("SELECT * FROM friends WHERE user_id='account-a'")).rowCount, 2);
    await repo.merge("account-a", "Alex Smith", ["Alexander Smith"], false);
    const after = (await pool.query("SELECT * FROM recommendations ORDER BY id")).rows;
    assert.equal(after[0].watch_with, "Alex Smith, Jamie");
    assert.equal(after[0].recommended_by, "Alex Smith");
    assert.equal(after[1].watch_with, "Alexa, Alex Smith");
    assert.deepEqual(after[2], before[2]);
    for (let i = 0; i < 2; i++) {
      for (const key of ["id", "user_id", "title", "hot_rating", "watched_at", "notes"]) {
        assert.deepEqual(after[i][key], before[i][key], key);
      }
    }
    const canonical = await repo.create("account-a", " ALEXANDER   SMITH ");
    assert.equal(canonical.name, "Alex Smith");
    assert.equal((await pool.query("SELECT * FROM friends WHERE user_id='account-a'")).rowCount, 1);
    assert.equal((await repo.merge("account-a", "Alex Smith", ["Alexander Smith"], false)).titlesUpdated, 0);
    // Force a failure during title updates: friend consolidation must roll back too.
    await repo.create("account-a", "Jay");
    await pool.query("UPDATE recommendations SET watch_with='Jay' WHERE title='First'");
    await pool.query("ALTER TABLE recommendations ADD CONSTRAINT reject_jamie CHECK (watch_with <> 'Jamie')");
    await assert.rejects(repo.merge("account-a", "Jamie", ["Jay"], false));
    assert.equal((await pool.query("SELECT watch_with FROM recommendations WHERE title='First'")).rows[0].watch_with, "Jay");
    assert.equal((await pool.query("SELECT * FROM friends WHERE user_id='account-a' AND name='Jay'")).rowCount, 1);
    assert.equal((await pool.query("SELECT * FROM friends WHERE user_id='account-a' AND name='Jamie'")).rowCount, 0);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
