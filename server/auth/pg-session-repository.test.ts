import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { Passport } from "passport";
import pg from "pg";
import { PgSessionRepository } from "./pg-session-repository";
import { createSessionRenewer, type StoredSession } from "./session-renewal";
import { createAuthenticatedHandler } from "./require-session";

// Explicit opt-in. Uses only synthetic session rows in the DEVELOPMENT DB;
// no user/recommendation rows, schema changes, or external identity provider.
test("two server instances renew one session safely and preserve it across requests", {
  skip: process.env.TEST_AUTH_DATABASE !== "1",
}, async () => {
  const firstPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const secondPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const sid = `auth-regression-${randomUUID()}`;
  const signingKey = "synthetic-session-test-only";
  const signature = createHmac("sha256", signingKey).update(sid).digest("base64").replace(/=+$/, "");
  const cookie = `hl_sid=${encodeURIComponent(`s:${sid}.${signature}`)}`;
  const now = Math.floor(Date.now() / 1000);
  const originalUser = {
    claims: { sub: `test-${randomUUID()}`, exp: now - 30 },
    access_token: "synthetic-old-access",
    refresh_token: "synthetic-refresh",
    expires_at: now - 30,
  };
  const stored: StoredSession = {
    cookie: { originalMaxAge: 86_400_000, expires: new Date(Date.now() + 86_400_000).toISOString(),
      secure: false, httpOnly: true, path: "/" },
    passport: { user: originalUser },
    returnTo: "/unchanged",
  };
  let mode: "success" | "outage" | "invalid" = "success";
  let refreshCalls = 0;
  const refresh = async (token: string) => {
    refreshCalls++;
    assert.equal(token, "synthetic-refresh");
    await new Promise(resolve => setTimeout(resolve, 50));
    if (mode === "outage") throw Object.assign(new Error("Synthetic timeout"), { code: "ETIMEDOUT" });
    if (mode === "invalid") throw { error: "invalid_grant" };
    return {
      access_token: "synthetic-new-access", expires_in: 3600,
      // Deliberately no ID token or replacement refresh token.
      claims: () => undefined,
    };
  };
  const stores: InstanceType<ReturnType<typeof connectPg>>[] = [];
  const servers: ReturnType<ReturnType<typeof express>["listen"]>[] = [];
  const makeServer = async (pool: pg.Pool) => {
    const app = express();
    const Store = connectPg(session);
    const store = new Store({
      pool, tableName: "sessions", createTableIfMissing: false, pruneSessionInterval: false,
    });
    stores.push(store);
    const passport = new Passport();
    passport.deserializeUser((user: Express.User, done) => done(null, user));
    app.use(session({
      name: "hl_sid", secret: signingKey, store, rolling: true,
      resave: false, saveUninitialized: false,
      cookie: { maxAge: 86_400_000, httpOnly: true },
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    const renew = createSessionRenewer({ repository: new PgSessionRepository(pool), refresh });
    app.get("/protected", createAuthenticatedHandler(renew), (req, res) =>
      res.json({ subject: (req.user as any).claims.sub }));
    const server = app.listen(0, "127.0.0.1");
    servers.push(server);
    await new Promise<void>(resolve => server.on("listening", resolve));
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/protected`;
  };
  const readStored = async () => (await firstPool.query<{ sess: StoredSession }>(
    "SELECT sess FROM sessions WHERE sid = $1", [sid],
  )).rows[0].sess;
  const writeStored = async (data: StoredSession) => {
    await firstPool.query(
      "UPDATE sessions SET sess = $2::jsonb, expire = NOW() + INTERVAL '1 day' WHERE sid = $1",
      [sid, JSON.stringify(data)],
    );
  };
  try {
    await firstPool.query(
      "INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2::jsonb, NOW() + INTERVAL '1 day')",
      [sid, JSON.stringify(stored)],
    );
    const urls = [await makeServer(firstPool), await makeServer(secondPool)];
    const fetchProtected = (index = 0) => fetch(urls[index], { headers: { cookie } });
    const results = await Promise.all(Array.from({ length: 10 }, (_, index) => fetchProtected(index % 2)));
    assert(results.every(result => result.status === 200));
    assert.equal(refreshCalls, 1, "a single refresh must serve both server instances");
    assert(results.every(result => result.headers.has("set-cookie")), "active sessions renew the cookie");
    let latest = await readStored();
    assert.equal(latest.passport?.user?.access_token, "synthetic-new-access");
    assert.equal(latest.passport?.user?.refresh_token, "synthetic-refresh");
    assert.equal(latest.returnTo, "/unchanged");
    assert.equal((await fetchProtected(1)).status, 200, "reopening uses persisted credentials");
    assert.equal(refreshCalls, 1);

    mode = "outage";
    latest.passport!.user!.expires_at = now - 30;
    await writeStored(latest);
    const unavailable = await Promise.all([fetchProtected(), fetchProtected(1)]);
    assert(unavailable.every(result => result.status === 503));
    assert.equal(refreshCalls, 2, "temporary failures are cooled down across instances");
    latest = await readStored();
    assert.equal(latest.passport?.user?.refresh_token, "synthetic-refresh");
    assert.equal(latest.passport?.user?.claims.sub, originalUser.claims.sub);

    mode = "success";
    latest.authRefreshRetryAt = now - 1;
    await writeStored(latest);
    assert.equal((await fetchProtected()).status, 200, "provider recovery restores access without login");

    mode = "invalid";
    latest = await readStored();
    latest.passport!.user!.expires_at = now - 30;
    await writeStored(latest);
    assert.equal((await fetchProtected()).status, 401);
    assert.equal((await readStored()).passport?.user, undefined);
    const callsAfterRejection = refreshCalls;
    assert.equal((await fetchProtected(1)).status, 401);
    assert.equal(refreshCalls, callsAfterRejection, "rejected tokens must not be reused");

    await writeStored(stored);
    await firstPool.query("UPDATE sessions SET expire = NOW() - INTERVAL '1 second' WHERE sid = $1", [sid]);
    assert.equal((await fetchProtected()).status, 401, "expired sessions cannot be resurrected");
  } finally {
    await Promise.all(servers.map(server => new Promise<void>(resolve => server.close(() => resolve()))));
    await Promise.all(stores.map(store => store.close()));
    await firstPool.query("DELETE FROM sessions WHERE sid = $1", [sid]);
    await Promise.all([firstPool.end(), secondPool.end()]);
  }
});
