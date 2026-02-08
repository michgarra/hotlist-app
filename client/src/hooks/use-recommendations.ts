import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { 
  type InsertRecommendation, 
  type UpdateRecommendationRequest 
} from "@shared/schema";

// GET /api/recommendations
export function useRecommendations() {
  return useQuery({
    queryKey: [api.recommendations.list.path],
    queryFn: async () => {
      const res = await fetch(api.recommendations.list.path);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return api.recommendations.list.responses[200].parse(await res.json());
    },
  });
}

// POST /api/recommendations
export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertRecommendation) => {
      const validated = api.recommendations.create.input.parse(data);
      const res = await fetch(api.recommendations.create.path, {
        method: api.recommendations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.recommendations.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create recommendation");
      }
      return api.recommendations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recommendations.list.path] });
    },
  });
}

// PATCH /api/recommendations/:id
export function useUpdateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateRecommendationRequest) => {
      const validated = api.recommendations.update.input.parse(updates);
      const url = buildUrl(api.recommendations.update.path, { id });
      
      const res = await fetch(url, {
        method: api.recommendations.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Recommendation not found");
        throw new Error("Failed to update recommendation");
      }
      
      return api.recommendations.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recommendations.list.path] });
    },
  });
}

// DELETE /api/recommendations/:id
export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recommendations.delete.path, { id });
      const res = await fetch(url, { method: api.recommendations.delete.method });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Recommendation not found");
        throw new Error("Failed to delete recommendation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recommendations.list.path] });
    },
  });
}
