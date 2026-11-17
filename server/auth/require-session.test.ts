import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthenticatedHandler } from "./require-session";
import type { RenewalResult } from "./session-renewal";

const user = () => ({
  claims: { sub: "middleware-test-user" },
  access_token: "test-access", expires_at: Math.floor(Date.now() / 1000) - 60,
});

async function run(result: RenewalResult | Error, reloadedUser: unknown = user()) {
  let reloads = 0;
  let nexts = 0;
  const req: any = {
    user: user(), sessionID: "test-sid", isAuthenticated() { return !!this.user; },
    session: { reload(callback: (error?: unknown) => void) {
      reloads++;
      req.session.passport = { user: reloadedUser };
      callback();
    } },
  };
  const res: any = {
    statusCode: 200, headers: {} as Record<string, string>,
    set(key: string, value: string) { this.headers[key] = value; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  const handler = createAuthenticatedHandler(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  await handler(req, res, () => { nexts++; });
  return { req, res, reloads, nexts };
}

test("renewal uses the committed session's user before a protected request", async () => {
  const renewed = { ...user(), expires_at: Math.floor(Date.now() / 1000) + 3600 };
  const outcome = await run({ kind: "authenticated", user: renewed }, renewed);
  assert.equal(outcome.nexts, 1);
  assert.equal(outcome.reloads, 1);
  assert.equal(outcome.req.user, renewed);
});

test("provider outage and database errors return retryable 503, never 401 or access", async () => {
  for (const result of [{ kind: "unavailable" } as RenewalResult, new Error("Test database failure")]) {
    const outcome = await run(result);
    assert.equal(outcome.res.statusCode, 503);
    assert.equal(outcome.res.body.code, "AUTH_TEMPORARILY_UNAVAILABLE");
    assert.equal(outcome.res.headers["Retry-After"], "10");
    assert.equal(outcome.nexts, 0);
  }
});

test("revoked/deleted sessions return 401 without resurrecting their old user", async () => {
  const outcome = await run({ kind: "unauthorized", reason: "invalid_grant" });
  assert.equal(outcome.res.statusCode, 401);
  assert.equal(outcome.req.user, undefined);
  assert.equal(outcome.reloads, 0);
  assert.equal(outcome.nexts, 0);
});

test("logout or identity change between renewal and reload prevents access", async () => {
  const renewed = { ...user(), expires_at: Math.floor(Date.now() / 1000) + 3600 };
  for (const reloaded of [undefined, { ...renewed, claims: { sub: "another-user" } }]) {
    const outcome = await run({ kind: "authenticated", user: renewed }, reloaded ?? null);
    assert.equal(outcome.res.statusCode, 401);
    assert.equal(outcome.nexts, 0);
  }
});
