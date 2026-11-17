import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthServiceUnavailableError, checkAuthUnavailable } from "./auth-events";
import { throwIfResNotOk } from "./queryClient";

test("auth 503 reports temporary unavailability rather than session expiry", async () => {
  const events: string[] = [];
  const originalWindow = globalThis.window;
  (globalThis as any).window = { dispatchEvent(event: Event) { events.push(event.type); } };
  try {
    await assert.rejects(checkAuthUnavailable(Response.json(
      { code: "AUTH_TEMPORARILY_UNAVAILABLE" }, { status: 503 },
    )), AuthServiceUnavailableError);
    assert.deepEqual(events, ["authTemporarilyUnavailable"]);
    await checkAuthUnavailable(Response.json({ message: "Unauthorized" }, { status: 401 }));
    await checkAuthUnavailable(new Response("Unrelated server outage", { status: 503 }));
    assert.equal(events.length, 1);
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test("API response handling reserves the sign-in prompt for actual 401s", async () => {
  const events: string[] = [];
  const originalWindow = globalThis.window;
  (globalThis as any).window = { dispatchEvent(event: Event) { events.push(event.type); } };
  try {
    await assert.rejects(throwIfResNotOk(Response.json(
      { code: "AUTH_TEMPORARILY_UNAVAILABLE" }, { status: 503 },
    )), AuthServiceUnavailableError);
    assert.deepEqual(events, ["authTemporarilyUnavailable"]);
    await assert.rejects(throwIfResNotOk(Response.json({ message: "Unauthorized" }, { status: 401 })));
    assert.deepEqual(events, ["authTemporarilyUnavailable", "sessionExpired"]);
  } finally {
    (globalThis as any).window = originalWindow;
  }
});
