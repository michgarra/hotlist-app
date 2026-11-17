import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyTokenResponse,
  createSessionRenewer,
  type SessionRepository,
  type StoredSession,
  type TokenResponse,
} from "./session-renewal";

const now = 1_800_000_000;
const originalUser = () => ({
  claims: { sub: "session-test-user", exp: now - 60, first_name: "Test" },
  access_token: "test-expired-access",
  refresh_token: "test-refresh",
  expires_at: now - 60,
});
const response = (overrides: Partial<TokenResponse> = {}): TokenResponse => ({
  access_token: "test-new-access",
  refresh_token: "test-rotated-refresh",
  expires_in: 3600,
  claims: () => undefined,
  ...overrides,
});

class MemoryRepository implements SessionRepository {
  data: StoredSession | null = { passport: { user: originalUser() }, unrelated: "preserved" };
  failSave = false;
  private pending: Promise<unknown> = Promise.resolve();

  withLockedSession<T>(
    _sid: string,
    operation: Parameters<SessionRepository["withLockedSession"]>[1],
  ): Promise<T> {
    const work = this.pending.then(async () => {
      let working = structuredClone(this.data);
      const result = await operation(working, async (value) => {
        if (this.failSave) throw new Error("Test persistence failure");
        working = structuredClone(value);
      });
      this.data = working;
      return result as T;
    });
    this.pending = work.catch(() => {});
    return work;
  }
}

test("old behavior loses refresh credentials and expiry on an access-only response", () => {
  const user: any = originalUser();
  const tokens = response({ refresh_token: undefined });
  user.claims = tokens.claims();
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  assert.equal(user.refresh_token, undefined);
  assert.equal(user.expires_at, undefined);
});

test("access-only refresh preserves identity and original refresh token", () => {
  const renewed = applyTokenResponse(originalUser(), response({ refresh_token: undefined }), now);
  assert.deepEqual(renewed.claims, originalUser().claims);
  assert.equal(renewed.refresh_token, "test-refresh");
  assert.equal(renewed.expires_at, now + 3600);
});

test("replacement refresh token is adopted and access expiry wins over ID-token expiry", () => {
  const renewed = applyTokenResponse(originalUser(), response({
    claims: () => ({ sub: "session-test-user", exp: now + 60 }),
  }), now);
  assert.equal(renewed.refresh_token, "test-rotated-refresh");
  assert.equal(renewed.expires_at, now + 3600);
});

test("new ID-token expiry is usable without expires_in; invalid expiry fails closed", () => {
  assert.equal(applyTokenResponse(originalUser(), response({
    expires_in: undefined,
    claims: () => ({ sub: "session-test-user", exp: now + 100 }),
  }), now).expires_at, now + 100);
  assert.throws(() => applyTokenResponse(originalUser(), response({ expires_in: undefined }), now));
  assert.throws(() => applyTokenResponse(originalUser(), response({
    claims: () => ({ sub: "someone-else", exp: now + 100 }),
  }), now));
});

test("parallel requests share one rotation and committed credentials", async () => {
  const repository = new MemoryRepository();
  let calls = 0;
  const renew = createSessionRenewer({
    repository,
    now: () => now,
    refresh: async () => { calls++; await new Promise(r => setTimeout(r, 10)); return response(); },
  });
  const outcomes = await Promise.all(Array.from({ length: 15 }, () => renew("sid", "session-test-user")));
  assert.equal(calls, 1);
  assert(outcomes.every(result => result.kind === "authenticated"));
  assert.equal(repository.data?.passport?.user?.refresh_token, "test-rotated-refresh");
  assert.equal(repository.data?.unrelated, "preserved");
});

test("temporary provider failures preserve credentials and share a bounded cooldown", async () => {
  const repository = new MemoryRepository();
  let currentTime = now;
  let calls = 0;
  const renew = createSessionRenewer({
    repository,
    now: () => currentTime,
    refresh: async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("Test provider unavailable"), { status: 503 });
      return response();
    },
  });
  assert.equal((await renew("sid", "session-test-user")).kind, "unavailable");
  assert.deepEqual(repository.data?.passport?.user, originalUser());
  assert.equal((await renew("sid", "session-test-user")).kind, "unavailable");
  assert.equal(calls, 1);
  currentTime += 11;
  assert.equal((await renew("sid", "session-test-user")).kind, "authenticated");
  assert.equal(repository.data?.authRefreshRetryAt, undefined);
});

test("invalid_grant removes only login state; a subsequent request cannot reuse it", async () => {
  const repository = new MemoryRepository();
  let calls = 0;
  const events: string[] = [];
  const renew = createSessionRenewer({
    repository, now: () => now, log: event => events.push(event),
    refresh: async () => { calls++; throw { error: "invalid_grant", error_description: "Test invalid grant" }; },
  });
  assert.equal((await renew("sid", "session-test-user")).kind, "unauthorized");
  assert.equal(repository.data?.passport?.user, undefined);
  assert.equal(repository.data?.unrelated, "preserved");
  assert.equal((await renew("sid", "session-test-user")).kind, "unauthorized");
  assert.equal(calls, 1);
  assert.deepEqual(events, ["refresh_rejected"]);
});

test("missing sessions, mismatched identity and missing refresh tokens fail closed", async () => {
  const repository = new MemoryRepository();
  let calls = 0;
  const renew = createSessionRenewer({
    repository, now: () => now, refresh: async () => { calls++; return response(); },
  });
  assert.equal((await renew("sid", "someone-else")).kind, "unauthorized");
  delete repository.data!.passport!.user!.refresh_token;
  assert.equal((await renew("sid", "session-test-user")).kind, "unauthorized");
  repository.data = null;
  assert.equal((await renew("sid", "session-test-user")).kind, "unauthorized");
  assert.equal(calls, 0);
});

test("a failed persistence operation cannot authenticate the request", async () => {
  const repository = new MemoryRepository();
  repository.failSave = true;
  const renew = createSessionRenewer({
    repository, now: () => now, refresh: async () => response(),
  });
  await assert.rejects(renew("sid", "session-test-user"), /persistence failure/);
  assert.equal(repository.data?.passport?.user?.access_token, "test-expired-access");
});
