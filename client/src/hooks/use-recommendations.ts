import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildUrl } from "@shared/routes";
import type { InsertRecommendation, UpdateRecommendationRequest } from "@shared/schema";
import { apiRequest, dispatchSessionExpired, throwIfResNotOk } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export function useRecommendations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["/api/recommendations"],
    enabled: isAuthenticated,
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRecommendation) => {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        const errData = await res.json();
        throw new Error(errData.message || "This title is already in your list");
      }
      await throwIfResNotOk(res);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/series-alerts"] });
    },
  });
}

export function useUpdateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateRecommendationRequest) => {
      const url = buildUrl("/api/recommendations/:id", { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await throwIfResNotOk(res);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/series-alerts"] });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/recommendations/:id", { id });
      const res = await fetch(url, { method: "DELETE" });
      await throwIfResNotOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/series-alerts"] });
    },
  });
}

export function useFriends() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["/api/friends"],
    enabled: isAuthenticated,
  });
}

export function useCreateFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.status === 409) {
        const data = await res.json();
        return data.friend;
      }
      await throwIfResNotOk(res);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });
}

export function useTmdbSearch(query: string) {
  return useQuery({
    queryKey: ["/api/tmdb/search", query],
    queryFn: async ({ signal }) => {
      if (!query || query.length < 2) return [];
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`, { signal, credentials: "include" });
      if (res.status === 401) {
        dispatchSessionExpired();
      }
      await throwIfResNotOk(res);
      return res.json();
    },
    enabled: query.length >= 2,
  });
}

export interface SeriesAlert {
  id: string;
  recommendationId: number;
  title: string;
  kind: "announced" | "airing";
  season: number;
  date: string | null;
}

export function useSeriesAlerts() {
  const { isAuthenticated } = useAuth();
  return useQuery<SeriesAlert[]>({
    queryKey: ["/api/series-alerts"],
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
}

export function useDismissSeriesAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/series-alerts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      await throwIfResNotOk(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/series-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });
}
