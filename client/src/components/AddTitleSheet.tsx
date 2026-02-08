import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Film, Tv, Star, Plus, ArrowLeft } from "lucide-react";
import { useTmdbSearch, useCreateRecommendation } from "@/hooks/use-recommendations";
import { useToast } from "@/hooks/use-toast";

interface AddTitleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TmdbResult {
  id: number;
  title: string;
  type: "Movie" | "TV Show";
  posterUrl: string | null;
  releaseDate: string | null;
  overview: string;
  rating: number;
}

export function AddTitleSheet({ open, onOpenChange }: AddTitleSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<TmdbResult | null>(null);
  const [recommendedBy, setRecommendedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState("");
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useTmdbSearch(debouncedQuery);
  const createMutation = useCreateRecommendation();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = useCallback(async (result: TmdbResult) => {
    setSelectedItem(result);
    setIsFetchingDetails(true);
    try {
      const res = await fetch(`/api/tmdb/details/${result.id}?type=${encodeURIComponent(result.type)}`);
      if (res.ok) {
        const details = await res.json();
        setSelectedItem(prev => prev ? { ...prev, ...details } : prev);
        if (details.platform) setPlatform(details.platform);
      }
    } catch {}
    setIsFetchingDetails(false);
  }, []);

  const handleAdd = async () => {
    if (!selectedItem) return;
    try {
      const details = selectedItem as any;
      await createMutation.mutateAsync({
        title: selectedItem.title,
        type: selectedItem.type,
        genre: details.genres ? details.genres.join(", ") : null,
        recommendedBy: recommendedBy || null,
        platform: platform || details.platform || null,
        status: "Want to Watch",
        notes: notes || null,
        tmdbId: selectedItem.id,
        posterUrl: details.posterUrl || selectedItem.posterUrl || null,
        imdbRating: details.imdbRating || selectedItem.rating || null,
        overview: details.overview || selectedItem.overview || null,
        releaseDate: details.releaseDate || selectedItem.releaseDate || null,
        runtime: details.runtime || null,
        seasons: details.seasons || null,
        episodes: details.episodes || null,
        cast: details.cast ? (Array.isArray(details.cast) ? details.cast.join(", ") : details.cast) : null,
        director: details.director || null,
        hotRating: null,
      });
      toast({ title: "Added!", description: `"${selectedItem.title}" added to your Hotlist.` });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Error", description: "Failed to add title", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedItem(null);
    setRecommendedBy("");
    setNotes("");
    setPlatform("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[85vh] overflow-y-auto" data-testid="dialog-add-title">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedItem && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedItem(null)} data-testid="button-back-search">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {selectedItem ? "Add Details" : "Search Title"}
          </DialogTitle>
        </DialogHeader>

        {!selectedItem ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search movies and TV shows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
                data-testid="input-search-tmdb"
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-1 max-h-[400px] overflow-y-auto" data-testid="list-search-results">
                {searchResults.map((result: TmdbResult) => (
                  <button
                    key={result.id}
                    className="w-full flex gap-3 p-2 rounded-md hover-elevate text-left transition-colors"
                    onClick={() => handleSelectResult(result)}
                    data-testid={`search-result-${result.id}`}
                  >
                    <div className="flex-shrink-0 w-10 h-14 rounded-md overflow-hidden bg-muted">
                      {result.posterUrl ? (
                        <img src={result.posterUrl} alt={result.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.type === "Movie" ? <Film className="w-4 h-4 text-muted-foreground" /> : <Tv className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground uppercase font-medium">{result.type === "Movie" ? "Film" : "TV"}</span>
                        {result.releaseDate && <span className="text-[11px] text-muted-foreground">{result.releaseDate.substring(0, 4)}</span>}
                        {result.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px]">
                            <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                            {result.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isSearching && debouncedQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            )}

            {debouncedQuery.length < 2 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Type a movie or show name to search
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              {selectedItem.posterUrl && (
                <div className="flex-shrink-0 w-20 h-28 rounded-md overflow-hidden">
                  <img src={selectedItem.posterUrl} alt={selectedItem.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg" data-testid="text-selected-title">{selectedItem.title}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground flex-wrap">
                  <span>{selectedItem.type}</span>
                  {selectedItem.releaseDate && <span>{selectedItem.releaseDate.substring(0, 4)}</span>}
                  {selectedItem.rating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {selectedItem.rating}
                    </span>
                  )}
                </div>
                {isFetchingDetails && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching details...
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Where to watch</label>
                <Input
                  placeholder="Netflix, Hulu, Cinema..."
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  data-testid="input-platform"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recommended by</label>
                <Input
                  placeholder="Friend's name"
                  value={recommendedBy}
                  onChange={(e) => setRecommendedBy(e.target.value)}
                  data-testid="input-recommended-by"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                <Textarea
                  placeholder='"Watch with the kids", "Date night movie"...'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none min-h-[60px]"
                  data-testid="input-notes"
                />
              </div>
            </div>

            <Button
              onClick={handleAdd}
              disabled={createMutation.isPending}
              className="w-full"
              data-testid="button-add-to-hotlist"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add to Hotlist
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
