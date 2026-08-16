import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus, Users, Plus, Loader2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Recommendation } from "@shared/schema";

interface HotlistEntry {
  rank: number;
  tmdbId: number;
  title: string;
  type: string;
  genre: string | null;
  posterUrl: string | null;
  imdbRating: number | null;
  overview: string | null;
  userCount: number;
  avgHotRating: number | null;
  hotRatingCount: number;
  trend: "up" | "down" | "stable";
}

interface HotlistChartProps {
  search: string;
  typeFilter: string;
  genreFilter: string;
  onOpenDetail?: (item: Recommendation) => void;
}

function entryToRecommendation(entry: HotlistEntry): Recommendation {
  return {
    id: entry.tmdbId,
    userId: "",
    title: entry.title,
    type: entry.type,
    genre: entry.genre,
    posterUrl: entry.posterUrl,
    imdbRating: entry.imdbRating,
    overview: entry.overview,
    tmdbId: entry.tmdbId,
    status: "Want to Watch",
    recommendedBy: null,
    platform: null,
    notes: null,
    hotRating: null,
    rtRating: null,
    releaseDate: null,
    runtime: null,
    seasons: null,
    episodes: null,
    lastKnownSeasons: null,
    cast: null,
    director: null,
    censorRating: null,
    watchWith: null,
    watchTags: null,
    watchReview: null,
    sortOrder: null,
    createdAt: null,
  };
}

function TrendIcon({ trend }: { trend: HotlistEntry["trend"] }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground/40" />;
}

export function HotlistChart({ search, typeFilter, genreFilter, onOpenDetail }: HotlistChartProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingId, setAddingId] = useState<number | null>(null);

  const { data: entries = [], isLoading } = useQuery<HotlistEntry[]>({
    queryKey: ["/api/hotlist"],
    staleTime: 5 * 60 * 1000, // re-fetch at most every 5 minutes
    refetchOnWindowFocus: true,
  });

  const addMutation = useMutation({
    mutationFn: async (entry: HotlistEntry) => {
      const res = await apiRequest("POST", "/api/recommendations", {
        title: entry.title,
        type: entry.type,
        genre: entry.genre,
        tmdbId: entry.tmdbId,
        posterUrl: entry.posterUrl,
        imdbRating: entry.imdbRating,
        overview: entry.overview,
        status: "Want to Watch",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotlist"] });
      toast({ title: "Added to My List" });
      setAddingId(null);
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.includes("409") || msg.includes("already")) {
        toast({ title: "Already in your list", variant: "default" });
      } else {
        toast({ title: "Could not add", description: "Try again", variant: "destructive" });
      }
      setAddingId(null);
    },
  });

  const filtered = entries.filter((e) => {
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    const matchesGenre = genreFilter === "all" || (e.genre && e.genre.toLowerCase().includes(genreFilter.toLowerCase()));
    return matchesSearch && matchesType && matchesGenre;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading the Hotlist...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <Flame className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="font-medium text-muted-foreground">
            {entries.length === 0 ? "No community data yet" : "No results"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
            {entries.length === 0
              ? "As users add titles, they'll appear here ranked by popularity"
              : "Try a different search or filter"}
          </p>
        </div>
      ) : (
        <div className="pb-24">
          {filtered.map((entry) => (
            <div
              key={entry.tmdbId}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 cursor-pointer active:bg-muted/40 transition-colors"
              onClick={() => onOpenDetail?.(entryToRecommendation(entry))}
              data-testid={`hotlist-entry-${entry.rank}`}
            >
              <div className="flex flex-col items-center w-7 shrink-0">
                <span className="text-sm font-bold text-foreground leading-none">
                  {entry.rank}
                </span>
                <TrendIcon trend={entry.trend} />
              </div>

              {entry.posterUrl ? (
                <img
                  src={entry.posterUrl}
                  alt={entry.title}
                  className="w-9 h-[54px] object-cover rounded shrink-0"
                />
              ) : (
                <div className="w-9 h-[54px] bg-muted rounded shrink-0 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-muted-foreground/30" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{entry.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.type}
                  {entry.genre ? ` · ${entry.genre.split(",")[0].trim()}` : ""}
                  {entry.imdbRating ? ` · ★ ${entry.imdbRating.toFixed(1)}` : ""}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-xs text-muted-foreground/60">
                      {entry.userCount} {entry.userCount === 1 ? "person" : "people"}
                    </span>
                  </div>
                  {entry.avgHotRating !== null && entry.hotRatingCount > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {entry.avgHotRating.toFixed(1)}
                        {entry.hotRatingCount > 1 && (
                          <span className="text-muted-foreground font-normal ml-0.5">
                            ({entry.hotRatingCount})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 w-8 h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingId(entry.tmdbId);
                  addMutation.mutate(entry);
                }}
                disabled={addMutation.isPending && addingId === entry.tmdbId}
                data-testid={`button-add-hotlist-${entry.rank}`}
              >
                {addMutation.isPending && addingId === entry.tmdbId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
