# Hotlist sign-in reliability

## Scope and maintenance

Hotlist keeps its existing Replit Auth identity provider, OIDC login/callback,
cookie name, session table, user IDs, and saved titles. This is a targeted repair,
not a reinstall, identity-provider migration, or replacement authentication
scaffold.

The project's Replit Auth skill directs scaffold installation/refresh through
the Replit Auth blueprint. Integration discovery returned no available Replit
Auth entry during this investigation. The existing blueprint remains installed;
application-specific renewal policy lives in `server/auth/`, with small wiring
changes to the existing integration. Do not reinstall the scaffold to apply
this repair or overwrite the custom session policy.

## What changed

- An expired access token is renewed under a PostgreSQL row lock on its existing
  session. Competing requests, including separate server instances, read the
  committed credentials rather than rotating the same refresh token.
- Refresh responses may omit a new refresh token or ID token. Preserve the
  existing credentials/identity when omitted and use the new access-token
  lifetime instead of an old ID-token expiry.
- Persist credentials before granting access. Reload the committed session
  into express-session so its response handling cannot overwrite new tokens
  with the request's original snapshot.
- A definite `invalid_grant` removes that session's authenticated user and
  requires a new login. It does not delete the Hotlist account, profile or titles.
- Temporary provider, network, or persistence failures deny protected access
  with an auth-specific 503 rather than incorrectly returning 401. Provider
  failures have a shared ten-second cooldown to avoid a request burst.
- The client retains its display cache on 503 and shows **Couldn't reconnect**
  with **Try again**, rather than telling the user they have been signed out.
  It automatically retries the identity check once and clears the notice after
  successful recovery. A genuine 401 still requires authentication.
- Active sessions renew the existing secure, HttpOnly, SameSite=Lax cookie, with
  a ninety-day inactivity window. The store's fallback TTL uses seconds.
- Discovery rejects are not cached for an hour, and provider requests are bounded
  by a ten-second timeout. Diagnostic events contain no token, session ID or email.

## Verification

Run the focused unit and middleware checks:

```sh
node --import tsx --test server/auth/session-renewal.test.ts server/auth/require-session.test.ts client/src/lib/auth-events.test.ts
```

For a **development database only**, the integration check adds synthetic session
rows to the existing session table and cleans up only those rows. It makes no
schema changes, external identity-provider calls, or changes to existing accounts
or recommendations:

```sh
TEST_AUTH_DATABASE=1 node --import tsx --test server/auth/*.test.ts client/src/lib/auth-events.test.ts
npm run check
npm run build
```

The PostgreSQL integration check drives two independent Express/Passport server
instances and connection pools sharing one synthetic session. It verifies a
single refresh for concurrent requests, response-cookie renewal, committed
credential retention after request completion and reopening, temporary-outage
recovery without login, invalid-grant rejection, and expired-session rejection.

### Browser verification outcome

The real OIDC returning-user browser pass was attempted, but the approved test
issuer returned HTTP 404 for discovery and could not start a login. The normal
development workflow was restored without that issuer override.

A separate UI-only browser check at 402×874 used intercepted synthetic responses
and no backend accounts or data changes. It confirmed signed-in chrome, retained
auth cache and the retry-only dialog on an auth 503, recovery to the same display
when auth 200 returns, and the sign-in dialog plus cleared auth cache on a genuine
401 response. These mocked UI checks are not evidence of a real provider login.
Real provider renewal and ninety-day retention remain a post-publish device and
longer-term observation check. The database integration test verifies actual
server middleware/session persistence using a synthetic refresh provider.

## Publishing and remaining limitations

Publishing is a user action. This repair needs no database migration and does not
recover a refresh credential that was already invalidated before it shipped.
Someone with an already-revoked session may need one new sign-in.

After publishing, check Safari and the home-screen app on a real iPhone: open,
close and reopen after inactivity, then follow a newly shared title. Verify
normal token renewal does not show another login. Observe safe renewal events
and auth-specific 401/503 responses over subsequent use; a short test cannot
prove ninety days of retention.

Replit controls its sign-in/permission pages and token revocation. Browser
contexts (including in-app browsers) may have separate cookie stores; native
Expo alone does not fix a server refresh bug or remove provider consent.
Explicit logout, revoked credentials, expired sessions, cleared site data and
security events can still require sign-in. Never bypass these checks or promise
that another login will never be required.
