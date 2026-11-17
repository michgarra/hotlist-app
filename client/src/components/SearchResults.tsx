import { useMemo } from "react";
import { Film, Flame, Loader2, RefreshCw, Star, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTmdbSearch } from "@/hooks/use-recommendations";
import type { Recommendation } from "@shared/schema";

export interface CatalogResult {
  id: number;
  title: string;
  type: "Movie" | "TV Show";
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string;
  rating: number;
}

interface CommunityEntry {
  tmdbId: number;
  type: string;
  section: "ranked" | "early";
  rank: number | null;
  avgHotRating?: number | null;
  hotRatingCount?: number;
}

interface SearchResultsProps {
  query: string;
  typeFilter?: string;
  saved: Recommendation[];
  savedLoading: boolean;
  savedError: boolean;
  community: CommunityEntry[];
  onRetrySaved: () => void;
  onOpenSaved: (item: Recommendation) => void;
  onOpenNew: (result: CatalogResult) => void;
}

export function SearchResults({
  query, typeFilter = "all", saved, savedLoading, savedError, community, onRetrySaved, onOpenSaved, onOpenNew,
}: SearchResultsProps) {
  const { data: catalog = [], isLoading, isError, refetch } = useTmdbSearch(query) as {
    data?: CatalogResult[]; isLoading: boolean; isError: boolean; refetch: () => void;
  };

  const merged = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const fallback = saved
      .filter(item => {
        const text = [item.title, item.cast, item.director].filter(Boolean).join(" ").toLocaleLowerCase();
        return normalized.split(/\s+/).filter(Boolean).every(token => text.includes(token));
      })
      .filter(item => !catalog.some(result => result.id === item.tmdbId && result.type === item.type))
      .map(item => ({
        id: item.tmdbId ?? -item.id,
        title: item.title,
        type: item.type as CatalogResult["type"],
        posterUrl: item.posterUrl,
        releaseDate: item.releaseDate,
        overview: item.overview ?? "",
        rating: item.imdbRating ?? 0,
        savedItem: item,
      }));
    return [
      ...catalog.map(result => ({ ...result, savedItem: saved.find(item => item.tmdbId === result.id && item.type === result.type) })),
      ...fallback,
    ].filter(result => typeFilter === "all" || typeFilter === "archived" || result.type === typeFilter);
  }, [catalog, query, saved, typeFilter]);

  if (query.trim().length < 2) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Search titles, actors or directors</p>;
  }
  if (savedError) {
    return (
      <div className="mx-3 my-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
        <p className="font-medium">Your saved titles couldn’t be checked.</p>
        <p className="mt-1 text-muted-foreground">We’ll avoid guessing which titles are already saved.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetrySaved}>Try again</Button>
      </div>
    );
  }
  if (isLoading || savedLoading) {
    return <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching…</div>;
  }
  if (isError) {
    return (
      <div className="mx-3 my-4 rounded-lg border border-border bg-muted/40 p-3" role="alert">
        <div className="text-center">
          <p className="text-sm font-medium">Search is unavailable right now.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}><RefreshCw className="mr-2 h-3.5 w-3.5" />Try again</Button>
        </div>
        {merged.some(result => result.savedItem) && (
          <div className="mt-3 border-t pt-2">
            <p className="mb-1 text-[11px] text-muted-foreground">Your saved matches:</p>
            {merged.filter(result => result.savedItem).map(result => (
              <button key={`saved-${result.type}-${result.id}`} type="button" onClick={() => onOpenSaved(result.savedItem!)} className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent">
                <span className="h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {result.posterUrl ? <img src={result.posterUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center">{result.type === "Movie" ? <Film className="h-4 w-4 text-muted-foreground" /> : <Tv className="h-4 w-4 text-muted-foreground" />}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{result.title}</span>
                  <span className="text-[10px] text-muted-foreground">{result.savedItem?.archived ? "Archived" : result.savedItem?.status === "Watched" ? "Watched" : "My List"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (!merged.length) return <p className="py-10 text-center text-sm text-muted-foreground">No titles found</p>;

  return (
    <div className="space-y-1 px-2 pb-3" data-testid="unified-search-results">
      {merged.map(result => {
        const savedItem = result.savedItem;
        const communityItem = community.find(item => item.tmdbId === result.id && item.type === result.type);
        const isArchived = !!savedItem?.archived;
        const listLabel = savedItem ? isArchived ? "Archived" : savedItem.status === "Watched" ? "Watched" : "My List" : null;
        return (
          <button
            key={`${result.type}-${result.id}`}
            type="button"
            onClick={() => savedItem ? onOpenSaved(savedItem) : onOpenNew(result)}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent active:bg-accent/80"
            data-testid={`unified-result-${result.type}-${result.id}`}
          >
            <span className="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-muted">
              {result.posterUrl ? <img src={result.posterUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center">{result.type === "Movie" ? <Film className="h-4 w-4 text-muted-foreground" /> : <Tv className="h-4 w-4 text-muted-foreground" />}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{result.title}{result.releaseDate && <span className="ml-1 font-normal text-muted-foreground">({result.releaseDate.slice(0, 4)})</span>}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase text-muted-foreground">{result.type === "Movie" ? "Film" : "TV"}</span>
                {result.rating > 0 && <span className="flex items-center gap-0.5 text-[10px]"><Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />{result.rating}</span>}
                {listLabel && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{listLabel}</span>}
                {communityItem && <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"><Flame className="h-2.5 w-2.5" />Hotlist{communityItem.section === "early" ? " · Early" : communityItem.rank ? ` · #${communityItem.rank}` : ""}{communityItem.avgHotRating != null ? ` · ${communityItem.avgHotRating.toFixed(1)} (${communityItem.hotRatingCount ?? 0})` : ""}</span>}
                {savedItem?.status === "Interested" && !isArchived && <span className="text-[10px] text-muted-foreground">Hot</span>}
                {savedItem?.status === "Watch Soon" && !isArchived && <span className="text-[10px] text-muted-foreground">Watch Soon</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
