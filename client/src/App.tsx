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
import { useQuery } from "@tanstack/react-query";

function AuthenticatedApp() {
  const { user, logout, isBeta } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    retry: false,
    enabled: isBeta,
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
