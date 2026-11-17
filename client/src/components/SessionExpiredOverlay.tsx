import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import flameLogo from "@/assets/flame-logo.png";

// Public routes where the overlay must never appear
const PUBLIC_PREFIXES = ["/list/", "/shared/"];

export function SessionExpiredOverlay() {
  const [status, setStatus] = useState<"expired" | "unavailable" | null>(null);
  const [location] = useLocation();

  const isPublicRoute = PUBLIC_PREFIXES.some(p => location.startsWith(p));

  useEffect(() => {
    const handler = () => {
      if (PUBLIC_PREFIXES.some(p => window.location.pathname.startsWith(p))) return;
      setStatus("expired");
    };
    const unavailable = () => {
      if (PUBLIC_PREFIXES.some(p => window.location.pathname.startsWith(p))) return;
      setStatus(current => current === "expired" ? current : "unavailable");
    };
    const restored = () => setStatus(null);
    window.addEventListener("sessionExpired", handler);
    window.addEventListener("authTemporarilyUnavailable", unavailable);
    window.addEventListener("authSessionRestored", restored);
    return () => {
      window.removeEventListener("sessionExpired", handler);
      window.removeEventListener("authTemporarilyUnavailable", unavailable);
      window.removeEventListener("authSessionRestored", restored);
    };
  }, []);

  if (!status || isPublicRoute) return null;
  const isUnavailable = status === "unavailable";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div role="alertdialog" aria-modal="true" aria-labelledby="session-status-title" aria-describedby="session-status-description" className="bg-background rounded-2xl shadow-xl max-w-sm w-full p-8 flex flex-col items-center text-center gap-5">
        <img src={flameLogo} alt="Hotlist" className="w-14 h-14 object-contain" />
        <div className="space-y-2">
          <h2 id="session-status-title" className="text-xl font-bold">{isUnavailable ? "Couldn't reconnect" : "Please sign in again"}</h2>
          <p id="session-status-description" className="text-muted-foreground text-sm leading-relaxed">
            {isUnavailable
              ? "Hotlist couldn't renew your connection right now. You haven't been signed out. Your saved list is safe — please try again shortly."
              : "Your sign-in is no longer valid. Log back in to continue — your saved Hotlist is safe."}
          </p>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            if (isUnavailable) window.location.reload();
            else window.location.href = `/api/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }}
          data-testid={isUnavailable ? "button-retry-session" : "button-relogin"}
        >
          <Flame className="w-4 h-4 mr-2" />
          {isUnavailable ? "Try again" : "Log back in"}
        </Button>
      </div>
    </div>
  );
}
