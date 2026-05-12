import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

function checkBetaAccess(email: string | undefined | null): boolean {
  const betaEmails = process.env.BETA_EMAILS;
  if (!betaEmails || betaEmails.trim() === "") {
    return true;
  }
  if (!email) return false;
  const allowed = betaEmails.split(",").map(e => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  }, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      const isBeta = checkBetaAccess(user?.email);
      res.json({ ...user, isBeta });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
