import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Flame, Clock, Tv, Film, Users, Megaphone, Plus, Loader2, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SharedTitle() {
  const [, params] = useRoute("/shared/:id");
  const id = params?.id;
  const { toast } = useToast();
  const [added, setAdded] = useState(false);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["/api/shared", id],
    queryFn: async () => {
      const res = await fetch(`/api/shared/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: item.title,
        type: item.type,
        genre: item.genre || null,
        platform: item.platform || null,
        status: "Want to Watch",
        tmdbId: item.tmdbId || null,
        posterUrl: item.posterUrl || null,
        imdbRating: item.imdbRating || null,
        overview: item.overview || null,
        releaseDate: item.releaseDate || null,
        runtime: item.runtime || null,
        seasons: item.seasons || null,
        episodes: item.episodes || null,
        cast: item.cast || null,
        director: item.director || null,
        notes: null,
        recommendedBy: null,
        hotRating: null,
      };
      await apiRequest("POST", "/api/recommendations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      setAdded(true);
      toast({ title: "Added!", description: `"${item.title}" has been added to your Hotlist.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add to Hotlist", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Flame className="w-12 h-12 text-primary mb-4" />
        <h1 className="text-xl font-bold mb-2">Title not found</h1>
        <p className="text-muted-foreground text-center mb-6">This shared recommendation may have been removed.</p>
        <Button onClick={() => window.location.href = "/"} data-testid="button-go-home">
          Go to Hotlist
        </Button>
      </div>
    );
  }

  const castList = item.cast ? item.cast.split(",").map((c: string) => c.trim()) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-black text-white p-3 flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary fill-primary" />
        <span className="font-bold text-lg tracking-tight">HOTLIST</span>
      </header>

      <div className="max-w-lg mx-auto p-4">
        {item.posterUrl && (
          <div className="relative w-full h-64 overflow-hidden rounded-lg mb-4">
            <img
              src={item.posterUrl.replace("/w342/", "/w780/")}
              alt={item.title}
              className="w-full h-full object-cover"
              data-testid="img-shared-poster"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg" data-testid="text-shared-title">
                {item.title}
                {item.releaseDate && <span className="text-xl font-normal text-white/70 ml-2">({item.releaseDate.substring(0, 4)})</span>}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">
                  {item.type === "Movie" ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
                  {item.type}
                </Badge>
                {item.genre && <span className="text-xs text-white/80">{item.genre}</span>}
              </div>
            </div>
          </div>
        )}

        {!item.posterUrl && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold" data-testid="text-shared-title-alt">
              {item.title}
              {item.releaseDate && <span className="text-xl font-normal text-muted-foreground ml-2">({item.releaseDate.substring(0, 4)})</span>}
            </h1>
          </div>
        )}

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {item.imdbRating && (
              <div className="flex items-center gap-1" data-testid="text-shared-rating">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-sm">{item.imdbRating}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            )}
            {item.runtime && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{item.runtime} min</span>
              </div>
            )}
            {item.seasons && (
              <span className="text-xs text-muted-foreground">
                {item.seasons} season{item.seasons > 1 ? "s" : ""}, {item.episodes} ep{item.episodes && item.episodes > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {item.platform && (
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Watch on <span className="font-medium">{item.platform}</span></span>
            </div>
          )}

          {item.overview && (
            <div data-testid="text-shared-overview">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Synopsis</h4>
              <p className="text-sm leading-relaxed">{item.overview}</p>
            </div>
          )}

          {castList.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Cast
              </h4>
              <div className="flex flex-wrap gap-1">
                {castList.map((name: string) => (
                  <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            </div>
          )}

          {item.director && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Director</h4>
              <p className="text-sm font-medium">{item.director}</p>
            </div>
          )}
        </Card>

        <div className="mt-4 space-y-3">
          {added ? (
            <Button disabled className="w-full" data-testid="button-added-success">
              <CheckCircle className="w-4 h-4 mr-2" />
              Added to your Hotlist
            </Button>
          ) : (
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending}
              className="w-full"
              data-testid="button-add-shared"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add to my Hotlist
            </Button>
          )}

          <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"} data-testid="button-view-hotlist">
            View my Hotlist
          </Button>
        </div>
      </div>
    </div>
  );
}
