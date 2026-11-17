import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { dispatchSessionExpired, queryClient, throwIfResNotOk } from "@/lib/queryClient";
import { AuthServiceUnavailableError } from "@/lib/auth-events";

type AuthUser = User & { isBeta: boolean };

const AUTH_CACHE_KEY = "hl_auth_cache";

function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const { user, exp } = JSON.parse(raw);
    if (Date.now() > exp) { localStorage.removeItem(AUTH_CACHE_KEY); return null; }
    return user;
  } catch { return null; }
}

function writeCachedUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, exp: Date.now() + 1000 * 60 * 60 * 4 }));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {}
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) {
    const wasSignedIn = !!readCachedUser() || !!queryClient.getQueryData(["/api/auth/user"]);
    writeCachedUser(null);
    if (wasSignedIn) dispatchSessionExpired();
    return null;
  }
  await throwIfResNotOk(response);
  const user = await response.json();
  writeCachedUser(user);
  window.dispatchEvent(new CustomEvent("authSessionRestored"));
  // Recover reads that failed during the same renewal outage. Do not replay
  // mutations: users must explicitly retry writes to avoid duplicate actions.
  void queryClient.refetchQueries({
    type: "active",
    predicate: query => query.queryKey[0] !== "/api/auth/user" &&
      query.state.status === "error" &&
      query.state.error instanceof AuthServiceUnavailableError,
  });
  return user;
}

async function logout(): Promise<void> {
  writeCachedUser(null);
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    initialData: () => readCachedUser() ?? undefined,
    retry: (failureCount, error) => error instanceof AuthServiceUnavailableError && failureCount < 1,
    retryDelay: 10_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isBeta: user?.isBeta ?? true,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
