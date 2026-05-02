import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import flameLogo from "@/assets/flame-logo.png";

// Public routes where the overlay must never appear
const PUBLIC_PREFIXES = ["/list/", "/shared/"];

export function SessionExpiredOverlay() {
  const [visible, setVisible] = useState(false);
  const [location] = useLocation();

  const isPublicRoute = PUBLIC_PREFIXES.some(p => location.startsWith(p));

  useEffect(() => {
    const handler = () => {
      if (PUBLIC_PREFIXES.some(p => window.location.pathname.startsWith(p))) return;
      setVisible(true);
    };
    window.addEventListener("sessionExpired", handler);
    return () => window.removeEventListener("sessionExpired", handler);
  }, []);

  if (!visible || isPublicRoute) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-background rounded-2xl shadow-xl max-w-sm w-full p-8 flex flex-col items-center text-center gap-5">
        <img src={flameLogo} alt="Hotlist" className="w-14 h-14 object-contain" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Session expired</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You've been signed out for security. Tap below to log back in — your Hotlist is safe and waiting.
          </p>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={() => { window.location.href = "/api/login"; }}
          data-testid="button-relogin"
        >
          <Flame className="w-4 h-4 mr-2" />
          Log back in
        </Button>
      </div>
    </div>
  );
}
