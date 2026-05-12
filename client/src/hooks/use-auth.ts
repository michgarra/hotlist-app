import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

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
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, exp: Date.now() + 1000 * 60 * 30 }));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
  } catch {}
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", { credentials: "include" });
  if (response.status === 401) { writeCachedUser(null); return null; }
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
  const user = await response.json();
  writeCachedUser(user);
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
    initialData: readCachedUser,
    retry: false,
    staleTime: 1000 * 60 * 30,
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
