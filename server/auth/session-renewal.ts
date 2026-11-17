// Application-owned renewal policy. The Replit OIDC login/callback scaffold is
// retained; refreshes use the existing session row as a cross-instance lock.
export interface SessionUser {
  claims: { sub: string; exp?: number; [key: string]: unknown };
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface StoredSession {
  passport?: { user?: SessionUser; [key: string]: unknown };
  authRefreshRetryAt?: number;
  [key: string]: unknown;
}

export interface SessionRepository {
  withLockedSession<T>(
    sid: string,
    operation: (
      session: StoredSession | null,
      persist: (session: StoredSession) => Promise<void>,
    ) => Promise<T>,
  ): Promise<T>;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  claims(): { sub: string; exp?: number; [key: string]: unknown } | undefined;
}

export type RenewalResult =
  | { kind: "authenticated"; user: SessionUser }
  | { kind: "unauthorized"; reason: "missing_session" | "invalid_grant" | "missing_refresh_token" }
  | { kind: "unavailable" };

export const REFRESH_RETRY_SECONDS = 10;

export function applyTokenResponse(
  previous: Partial<SessionUser>,
  tokens: TokenResponse,
  now = Math.floor(Date.now() / 1000),
): SessionUser {
  const newClaims = tokens.claims();
  if (previous.claims && newClaims && newClaims.sub !== previous.claims.sub) {
    throw new Error("Refresh changed subject");
  }
  const claims = newClaims ?? previous.claims;
  // Refresh responses need not include another ID token or refresh token.
  // expires_in describes the new access token; old ID-token exp must not win.
  const expiresAt = Number.isFinite(tokens.expires_in) && tokens.expires_in! > 0
    ? now + tokens.expires_in!
    : newClaims?.exp;
  if (!claims?.sub || !tokens.access_token || !expiresAt || expiresAt <= now) {
    throw new Error("Token response missing valid identity or expiry");
  }
  return {
    ...previous,
    claims,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || previous.refresh_token,
    expires_at: expiresAt,
  };
}

export function isInvalidGrant(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "error" in error && error.error === "invalid_grant";
}

export function createSessionRenewer(options: {
  repository: SessionRepository;
  refresh: (token: string) => Promise<TokenResponse>;
  now?: () => number;
  log?: (event: string) => void;
}) {
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  const log = options.log ?? (() => {});
  return (sid: string, expectedSubject: string): Promise<RenewalResult> =>
    options.repository.withLockedSession(sid, async (session, persist) => {
      const user = session?.passport?.user;
      // Never resurrect a deleted/expired session or trust the stale request's
      // copy after logout or an identity change.
      if (!session || !user || user.claims?.sub !== expectedSubject) {
        return { kind: "unauthorized", reason: "missing_session" };
      }
      if (Number.isFinite(user.expires_at) && user.expires_at > now()) {
        return { kind: "authenticated", user };
      }
      if (!user.refresh_token) {
        return { kind: "unauthorized", reason: "missing_refresh_token" };
      }
      if (session.authRefreshRetryAt && session.authRefreshRetryAt > now()) {
        return { kind: "unavailable" };
      }

      let renewed: SessionUser;
      try {
        const tokens = await options.refresh(user.refresh_token);
        renewed = applyTokenResponse(user, tokens, now());
      } catch (error) {
        if (isInvalidGrant(error)) {
          // A definite provider rejection requires a new login. Removing only
          // the authenticated user prevents every subsequent request retrying
          // the same revoked grant; saved Hotlist data is never touched.
          delete session.passport!.user;
          delete session.authRefreshRetryAt;
          await persist(session);
          log("refresh_rejected");
          return { kind: "unauthorized", reason: "invalid_grant" };
        }
        // Network, rate-limit, discovery and provider/server failures are NOT
        // evidence of a revoked login. Preserve credentials and fail closed.
        session.authRefreshRetryAt = now() + REFRESH_RETRY_SECONDS;
        await persist(session);
        log("refresh_unavailable");
        return { kind: "unavailable" };
      }

      session.passport!.user = renewed;
      delete session.authRefreshRetryAt;
      // Persist before releasing the lock or allowing any protected request.
      // Persistence errors must escape as unavailable, never as a valid login.
      await persist(session);
      log("refresh_succeeded");
      return { kind: "authenticated", user: renewed };
    });
}
