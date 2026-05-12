import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Users, Share2, Star, AlertCircle } from "lucide-react";
import flameLogo from "@/assets/flame-logo.png";

export default function Landing() {
  const authFailed = new URLSearchParams(window.location.search).get("auth_failed") === "1";
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
            onClick={() => window.location.href = "/api/login"}
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
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-get-started"
          >
            <Flame className="w-5 h-5 mr-2" />
            Get Started
          </Button>

          <p className="text-xs text-muted-foreground">Free to use. No credit card required.</p>
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
