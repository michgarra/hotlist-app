import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Plus, Check, Film, Tv, Loader2, AlertCircle, LogIn, Clock, Share2 } from "lucide-react";
import type { Recommendation } from "@shared/schema";
import flameLogo from "@/assets/flame-logo.png";

interface PublicListData {
  ownerName: string;
  items: Recommendation[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Coming Soon") return (
    <span className="text-[10px] font-medium text-sky-500">📅 Coming Soon</span>
  );
  if (status === "Hot") return (
    <span className="text-[10px] font-medium text-primary">🔥 Hot</span>
  );
  if (status === "Watching") return (
    <span className="text-[10px] font-medium text-green-500">▶ Watching</span>
  );
  return null;
}

function PublicListItem({
  item,
  token,
  added,
  onAdded,
  isLoggedIn,
}: {
  item: Recommendation;
  token: string;
  added: boolean;
  onAdded: (id: number) => void;
  isLoggedIn: boolean;
}) {
  const [, navigate] = useLocation();

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/public-list/${token}/add`, { itemId: item.id }),
    onSuccess: () => {
      onAdded(item.id);
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0" data-testid={`item-public-${item.id}`}>
      {item.posterUrl ? (
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-10 h-14 object-cover rounded flex-shrink-0 bg-muted"
        />
      ) : (
        <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
          {item.type === "Movie" ? <Film className="w-4 h-4 text-muted-foreground" /> : <Tv className="w-4 h-4 text-muted-foreground" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {item.type}{item.releaseDate ? ` · ${item.releaseDate.substring(0, 4)}` : ""}
          </span>
          {item.genre && <span className="text-xs text-muted-foreground truncate">{item.genre.split(",")[0]}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.imdbRating && (
            <span className="text-xs text-muted-foreground">⭐ {item.imdbRating}</span>
          )}
          {item.platform && (
            <span className="text-xs text-muted-foreground truncate">{item.platform.split(",")[0]}</span>
          )}
          <StatusBadge status={item.status} />
        </div>
      </div>
      {isLoggedIn && (
        <Button
          variant={added ? "default" : "outline"}
          size="sm"
          className={`flex-shrink-0 h-8 px-3 text-xs ${added ? "bg-green-500 hover:bg-green-500 border-green-500 text-white" : ""}`}
          onClick={() => {
            if (!added) addMutation.mutate();
          }}
          disabled={addMutation.isPending || added}
          data-testid={`button-add-${item.id}`}
        >
          {addMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : added ? (
            <><Check className="w-3 h-3 mr-1" />Added</>
          ) : (
            <><Plus className="w-3 h-3 mr-1" />Add</>
          )}
        </Button>
      )}
    </div>
  );
}

export default function PublicList() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async (ownerName: string, count: number) => {
    const url = window.location.href;
    const text = `Check out ${ownerName}'s Hotlist 🔥 ${count} title${count !== 1 ? "s" : ""} to watch`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${ownerName}'s Hotlist 🔥`, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {}
  };

  const { data, isLoading, error } = useQuery<PublicListData>({
    queryKey: [`/api/public-list/${token}`],
    retry: false,
  });

  const handleAdded = (id: number) => {
    setAddedIds(prev => new Set(Array.from(prev).concat(id)));
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-bold">List not found</h2>
        <p className="text-sm text-muted-foreground">This link may have expired or is invalid.</p>
        <Button onClick={() => navigate("/")} variant="outline">Go home</Button>
      </div>
    );
  }

  const { ownerName, items } = data;
  const movies = items.filter(i => i.type === "Movie");
  const shows = items.filter(i => i.type === "TV Show");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <img src={flameLogo} alt="Hotlist" className="w-8 h-8 object-contain" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-white/70 uppercase tracking-wider leading-none mb-0.5">Hotlist</p>
          <h1 className="text-base font-bold leading-none">{ownerName}'s List</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/20 gap-1.5 text-xs font-semibold px-3"
          onClick={() => handleShare(ownerName, items.length)}
          data-testid="button-share-public-list"
        >
          {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {shareCopied ? "Copied!" : "Share"}
        </Button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4">
        {!user && (
          <div className="mb-4 flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <LogIn className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Sign in to add titles to your list</p>
            </div>
            <Button size="sm" onClick={() => navigate("/")} className="flex-shrink-0 text-xs h-7">
              Sign in
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Flame className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">Nothing on their list yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {movies.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Film className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Movies <span className="font-normal">({movies.length})</span>
                  </h2>
                </div>
                <div className="bg-card rounded-xl border border-border/50 px-4">
                  {movies.map(item => (
                    <PublicListItem
                      key={item.id}
                      item={item}
                      token={token!}
                      added={addedIds.has(item.id)}
                      onAdded={handleAdded}
                      isLoggedIn={!!user}
                    />
                  ))}
                </div>
              </section>
            )}

            {shows.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Tv className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    TV Shows <span className="font-normal">({shows.length})</span>
                  </h2>
                </div>
                <div className="bg-card rounded-xl border border-border/50 px-4">
                  {shows.map(item => (
                    <PublicListItem
                      key={item.id}
                      item={item}
                      token={token!}
                      added={addedIds.has(item.id)}
                      onAdded={handleAdded}
                      isLoggedIn={!!user}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by <span className="font-semibold text-primary">Hotlist</span> · Track what you want to watch
        </p>
      </div>
    </div>
  );
}
