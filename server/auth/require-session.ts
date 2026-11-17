import type { RequestHandler } from "express";
import { REFRESH_RETRY_SECONDS, type RenewalResult } from "./session-renewal";

export function createAuthenticatedHandler(
  renewSession: (sid: string, subject: string) => Promise<RenewalResult>,
): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as any;
    if (!req.isAuthenticated() || !user?.expires_at || !user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (Math.floor(Date.now() / 1000) < user.expires_at) return next();

    const unavailable = () => res
      .set("Retry-After", String(REFRESH_RETRY_SECONDS))
      .status(503)
      .json({
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
        message: "We couldn't renew your session right now. Please try again shortly.",
      });
    try {
      const result = await renewSession(req.sessionID, user.claims.sub);
      if (result.kind === "unavailable") return unavailable();
      if (result.kind === "unauthorized") {
        delete (req as { user?: Express.User }).user;
        return res.status(401).json({ message: "Unauthorized" });
      }
      // Use the committed session. Saving the request's stale copy would
      // overwrite rotated tokens; reload also resets express-session tracking.
      await new Promise<void>((resolve, reject) =>
        req.session.reload((err) => (err ? reject(err) : resolve())),
      );
      req.user = (req.session as any).passport?.user;
      if (!req.isAuthenticated() ||
          (req.user as any)?.claims?.sub !== user.claims.sub ||
          !((req.user as any)?.expires_at > Math.floor(Date.now() / 1000))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      return next();
    } catch {
      console.warn("[auth] session_renewal_unavailable");
      return unavailable();
    }
  };
}
