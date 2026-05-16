import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Users, Share2, Star, AlertCircle, X, Smartphone } from "lucide-react";
import flameLogo from "@/assets/flame-logo.png";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isRunningStandalone(): boolean {
  return (window.navigator as any).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

export default function Landing() {
  const authFailed = new URLSearchParams(window.location.search).get("auth_failed") === "1";
  const loginUrl = `/api/login?next=${encodeURIComponent(window.location.pathname)}`;

  const platform = detectPlatform();
  const standalone = isRunningStandalone();
  const [tipDismissed, setTipDismissed] = useState(() =>
    sessionStorage.getItem("hl_install_tip_dismissed") === "1"
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [androidInstalled, setAndroidInstalled] = useState(false);
  const promptRef = useRef<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e;
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("hl_install_tip_dismissed", "1");
    setTipDismissed(true);
  };

  const handleAndroidInstall = async () => {
    const prompt = promptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setAndroidInstalled(true);
      handleDismiss();
    }
  };

  const showTip = !standalone && !tipDismissed && platform !== "other";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-black text-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src={flameLogo} alt="Hotlist" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg tracking-tight">HOTLIST</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/30 text-white"
            onClick={() => window.location.href = loginUrl}
            data-testid="button-login-header"
          >
            Log in
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {authFailed && (
          <div className="mb-6 max-w-md w-full flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Sign-in didn't complete. Please try again — tap "Get Started" below.</span>
          </div>
        )}
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <img src={flameLogo} alt="Hotlist" className="w-20 h-20 object-contain" />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-serif">
              Your friends know<br />what you should watch
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
              Collect movie and TV show recommendations from friends. Track what to watch, rate what you've seen, and never forget a great suggestion again.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs text-base"
            onClick={() => window.location.href = loginUrl}
            data-testid="button-get-started"
          >
            <Flame className="w-5 h-5 mr-2" />
            Get Started
          </Button>

          <p className="text-xs text-muted-foreground">Free to use. No credit card required.</p>

          {showTip && (
            <div className="relative max-w-xs mx-auto rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-left" data-testid="card-install-tip">
              <button
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-dismiss-install-tip"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-2.5">
                <Smartphone className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold">Add to your home screen</span>
              </div>

              {platform === "ios" && (
                <ol className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">1.</span>
                    Tap the <span className="inline-flex items-center gap-0.5 font-medium text-foreground">Share <span className="text-base leading-none">⎙</span></span> button at the bottom of Safari
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">2.</span>
                    Scroll down and tap <span className="font-medium text-foreground">"Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">3.</span>
                    Tap <span className="font-medium text-foreground">"Add"</span> — done!
                  </li>
                </ol>
              )}

              {platform === "android" && deferredPrompt && !androidInstalled && (
                <div className="space-y-2.5">
                  <p className="text-xs text-muted-foreground">Install Hotlist as an app on your phone — no App Store needed.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/40 text-primary text-xs"
                    onClick={handleAndroidInstall}
                    data-testid="button-android-install"
                  >
                    Install Hotlist
                  </Button>
                </div>
              )}

              {platform === "android" && !deferredPrompt && !androidInstalled && (
                <ol className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">1.</span>
                    Tap the <span className="font-medium text-foreground">⋮ menu</span> in Chrome (top right)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">2.</span>
                    Tap <span className="font-medium text-foreground">"Add to Home screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">3.</span>
                    Tap <span className="font-medium text-foreground">"Add"</span> — done!
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl w-full">
          <Card className="p-5 text-center space-y-2">
            <div className="flex justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Friend Recommendations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track who recommended what and never lose a suggestion.
            </p>
          </Card>

          <Card className="p-5 text-center space-y-2">
            <div className="flex justify-center">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Flame Ratings</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rate what you watch on a 1-5 flame scale. See what's truly hot.
            </p>
          </Card>

          <Card className="p-5 text-center space-y-2">
            <div className="flex justify-center">
              <Share2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">Share via WhatsApp</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send titles to friends with a tap. They can add it to their list instantly.
            </p>
          </Card>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground">
        Hotlist &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
