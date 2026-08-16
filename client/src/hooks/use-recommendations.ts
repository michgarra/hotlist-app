import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { buildUrl } from "@shared/routes";
import type { InsertRecommendation, UpdateRecommendationRequest } from "@shared/schema";
import { apiRequest, dispatchSessionExpired } from "@/lib/queryClient";
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
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
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
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/recommendations/:id", { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
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
      if (!res.ok) throw new Error("Failed to add friend");
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
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        dispatchSessionExpired();
        return [];
      }
      if (!res.ok) return [];
      return res.json();
    },
    enabled: query.length >= 2,
  });
}
