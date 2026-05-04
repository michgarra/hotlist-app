import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import Landing from "@/pages/Landing";
import BetaWaitlist from "@/pages/BetaWaitlist";
import SharedTitle from "@/pages/SharedTitle";
import PublicList from "@/pages/PublicList";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { SessionExpiredOverlay } from "@/components/SessionExpiredOverlay";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

function AuthenticatedApp() {
  const { user, logout, isBeta } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    retry: false,
    enabled: isBeta,
  });

  // Prefetch recommendations in parallel with profile so Dashboard renders instantly
  useQuery({
    queryKey: ["/api/recommendations"],
    enabled: isBeta,
    staleTime: Infinity,
  });

  // Prefetch friends list in parallel too
  useQuery({
    queryKey: ["/api/friends"],
    enabled: isBeta,
    staleTime: Infinity,
  });

  if (!isBeta) {
    return <BetaWaitlist email={user?.email} onLogout={logout} />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return <Onboarding />;
  }

  return <Dashboard />;
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // If auth check takes more than 8 seconds, show a recovery option
  // instead of leaving users stuck on a black screen forever (Angie's issue)
  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTooLong(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {loadingTooLong && (
          <div className="text-center px-6 space-y-3">
            <p className="text-sm text-gray-400">Taking longer than usual…</p>
            <button
              onClick={() => {
                qc.resetQueries({ queryKey: ["/api/auth/user"] });
                setLoadingTooLong(false);
              }}
              className="text-sm text-primary underline underline-offset-2"
            >
              Tap to retry
            </button>
            <p className="text-xs text-gray-600">
              Or{" "}
              <a href="/" className="underline underline-offset-2 text-gray-500">
                reload the page
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/shared/:id" component={SharedTitle} />
      <Route path="/list/:token" component={PublicList} />
      <Route path="/admin">
        {user ? <Admin /> : <Landing />}
      </Route>
      <Route path="/onboarding">
        {user ? <Onboarding /> : <Landing />}
      </Route>
      <Route path="/">
        {user ? <AuthenticatedApp /> : <Landing />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
        <SessionExpiredOverlay />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
