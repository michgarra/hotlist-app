import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { pool } from "../../db";
import { PgSessionRepository } from "../../auth/pg-session-repository";
import {
  applyTokenResponse,
  createSessionRenewer,
} from "../../auth/session-renewal";
import { createAuthenticatedHandler } from "../../auth/require-session";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
      undefined,
      undefined,
      { timeout: 10 },
    );
  },
  // Do not cache a rejected discovery promise for an hour after an outage.
  { maxAge: 3600 * 1000, promise: true }
);

export function getSession() {
  const sessionTtl = 90 * 24 * 60 * 60 * 1000; // 90 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl / 1000, // connect-pg-simple expects seconds, cookies use ms
    tableName: "sessions",
  });
  return session({
    name: "hl_sid",
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  Object.assign(user, applyTokenResponse(user, tokens));
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    // Store the intended destination so successReturnToOrRedirect picks it up
    const returnTo = typeof req.query.next === "string" && req.query.next.startsWith("/") ? req.query.next : "/";
    (req.session as any).returnTo = returnTo;
    passport.authenticate(`replitauth:${req.hostname}`, {
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback",
    (req, res, next) => {
      ensureStrategy(req.hostname);
      passport.authenticate(`replitauth:${req.hostname}`, {
        failureRedirect: "/?auth_failed=1",
      })(req, res, next);
    },
    (req, res) => {
      // Log the login event (fire-and-forget)
      const userId = (req.user as any)?.claims?.sub;
      if (userId) {
        storage.logLoginEvent(userId).catch(() => {});
      }
      const returnTo = (req.session as any).returnTo || "/";
      delete (req.session as any).returnTo;
      res.redirect(returnTo);
    }
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

const renewSession = createSessionRenewer({
  repository: new PgSessionRepository(pool),
  refresh: async (token) => client.refreshTokenGrant(await getOidcConfig(), token),
  // Fixed event names only: no emails, tokens, session IDs or provider payloads.
  log: (event) => console.info(`[auth] ${event}`),
});

export const isAuthenticated = createAuthenticatedHandler(renewSession);
