import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Film, Tv, Star, Plus, ArrowLeft, UserPlus, Flame } from "lucide-react";
import { useTmdbSearch, useRecommendations, useCreateRecommendation, useUpdateRecommendation, useFriends, useCreateFriend } from "@/hooks/use-recommendations";
import { useToast } from "@/hooks/use-toast";
import type { Recommendation } from "@shared/schema";
import { personKey, watchWithNames } from "@shared/people";

interface AddTitleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: Recommendation | null;
  defaultStatus?: string;
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

export function AddTitleSheet({ open, onOpenChange, editItem, defaultStatus }: AddTitleSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<TmdbResult | null>(null);
  const [recommendedBy, setRecommendedBy] = useState("");
  const [watchWith, setWatchWith] = useState<string[]>([]);
  const [watchWithInput, setWatchWithInput] = useState("");
  const [notes, setNotes] = useState("");
  const [platform, setPlatform] = useState("");
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [hotRating, setHotRating] = useState<number>(3);
  const [sheetStyle, setSheetStyle] = useState<React.CSSProperties>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const watchWithInputRef = useRef<HTMLInputElement>(null);
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSheetStyle({});
      return;
    }
    const update = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // On iOS the keyboard raises the visual viewport — keep sheet anchored to visible area
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      setSheetStyle({
        height: `${vv.height * 0.92}px`,
        bottom: `${Math.max(0, keyboardHeight)}px`,
      });
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [open]);

  // Delayed focus: wait for sheet slide-up animation (~350ms) before focusing
  // so the keyboard appears AFTER the sheet has fully positioned itself on iOS
  useEffect(() => {
    if (!open || selectedItem) return;
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [open, selectedItem]);

  const { data: searchResults = [], isLoading: isSearching } = useTmdbSearch(debouncedQuery);
  const { data: allRecommendations = [] } = useRecommendations();
  const createMutation = useCreateRecommendation();
  const updateMutation = useUpdateRecommendation();
  const { data: friendsList = [] } = useFriends();
  const createFriendMutation = useCreateFriend();
  const { toast } = useToast();

  // Unique Watch With names from all existing titles — used for autocomplete
  const allWatchWithNames = useMemo(() => {
    const names = new Map<string, string>();
    const people = friendsList as { name: string; aliases?: string[] }[];
    (allRecommendations as any[]).forEach(r => {
      watchWithNames(r.watchWith, people).forEach(n => names.set(personKey(n), n));
    });
    return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
  }, [allRecommendations, friendsList]);

  // Suggestions: names that start with current input and aren't already selected
  const watchWithSuggestions = useMemo(() => {
    const q = personKey(watchWithInput);
    if (!q) return [];
    return allWatchWithNames.filter(n =>
      (personKey(n).startsWith(q) || (friendsList as { name: string; aliases?: string[] }[]).some(p =>
        personKey(p.name) === personKey(n) && p.aliases?.some(a => personKey(a).startsWith(q))
      )) &&
      !watchWith.some(w => personKey(w) === personKey(n))
    );
  }, [watchWithInput, allWatchWithNames, watchWith, friendsList]);

  const addWatchWithName = useCallback((name: string) => {
    setWatchWith(prev => watchWithNames([...prev, name].join(", "), friendsList as any[]));
    setWatchWithInput("");
  }, [friendsList]);

  const isEditing = !!editItem;

  useEffect(() => {
    if (editItem && open) {
      setRecommendedBy(editItem.recommendedBy || "");
      setWatchWith(watchWithNames(editItem.watchWith, friendsList as any[]));
      setWatchWithInput("");
      setNotes(editItem.notes || "");
      setPlatform(editItem.platform || "");
      setHotRating(editItem.hotRating ?? 3);
      setSelectedItem({
        id: editItem.tmdbId || 0,
        title: editItem.title,
        type: editItem.type as "Movie" | "TV Show",
        posterUrl: editItem.posterUrl || null,
        releaseDate: editItem.releaseDate || null,
        overview: editItem.overview || "",
        rating: editItem.imdbRating || 0,
      });
    }
  }, [editItem, open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = useCallback(async (result: TmdbResult) => {
    // Dismiss keyboard immediately so the sheet expands to full height
    // before showing the details view — otherwise iOS keeps the keyboard
    // open and the poster/title area is hidden above the visible area
    (document.activeElement as HTMLElement)?.blur();
    setSelectedItem(result);
    // Scroll details to top after transition
    setTimeout(() => detailsScrollRef.current?.scrollTo({ top: 0 }), 50);
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

  const handleAddFriend = async () => {
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    try {
      const friend = await createFriendMutation.mutateAsync(trimmed);
      setRecommendedBy(friend.name);
      setNewFriendName("");
      setShowAddFriend(false);
    } catch {
      toast({ title: "Error", description: "Failed to add friend", variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    if (!selectedItem) return;
    try {
      const details = selectedItem as any;
      const payload = {
        title: selectedItem.title,
        type: selectedItem.type,
        genre: details.genres ? (Array.isArray(details.genres) ? details.genres.join(", ") : details.genres) : null,
        recommendedBy: recommendedBy || null,
        platform: platform || details.platform || null,
        status: isEditing ? editItem!.status : (() => {
          if (defaultStatus) return defaultStatus;
          const rd = details.releaseDate || selectedItem.releaseDate;
          if (rd && new Date(rd + "T00:00:00") > new Date()) return "Coming Soon";
          return "Want to Watch";
        })(),
        watchWith: watchWithNames([...watchWith, watchWithInput].join(", "), friendsList as any[]).join(", ") || null,
        notes: notes || null,
        tmdbId: selectedItem.id || null,
        posterUrl: details.posterUrl || selectedItem.posterUrl || null,
        imdbRating: details.imdbRating || selectedItem.rating || null,
        overview: details.overview || selectedItem.overview || null,
        releaseDate: details.releaseDate || selectedItem.releaseDate || null,
        runtime: details.runtime || null,
        seasons: details.seasons || null,
        episodes: details.episodes || null,
        cast: details.cast ? (Array.isArray(details.cast) ? details.cast.join(", ") : details.cast) : null,
        director: details.director || null,
        censorRating: details.censorRating || null,
        hotRating: isEditing && editItem!.hotRating != null ? hotRating : null,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: editItem!.id, ...payload });
        toast({ title: "Updated!", description: `"${selectedItem.title}" has been updated.`, duration: 2000 });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Added!", description: `"${selectedItem.title}" added to your Hotlist.`, duration: 2000 });
      }
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    setSelectedItem(null);
    setRecommendedBy("");
    setWatchWith([]);
    setWatchWithInput("");
    setNotes("");
    setPlatform("");
    setShowAddFriend(false);
    setNewFriendName("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const friends = ((friendsList as any[]) || []).filter((friend, index, all) =>
    all.findIndex(p => personKey(p.name) === personKey(friend.name)) === index
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col p-0 rounded-t-xl"
        style={sheetStyle}
        data-testid="dialog-add-title"
      >
        {/* Fixed header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            {selectedItem && !isEditing && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={() => setSelectedItem(null)} data-testid="button-back-search">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {isEditing ? "Edit Title" : selectedItem ? "Add Details" : "Search Title"}
          </SheetTitle>
        </SheetHeader>

        {/* Search input — fixed between header and results, never inside scroll */}
        {!selectedItem && !isEditing && (
          <div className="flex-shrink-0 bg-background px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search movies, TV shows, actors or directors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="search"
                onFocus={() => {
                  // Scroll input into view on iOS where keyboard can obscure it
                  setTimeout(() => searchInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
                }}
                data-testid="input-search-tmdb"
              />
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div ref={detailsScrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {!selectedItem && !isEditing ? (
              <div className="px-4 py-2" data-testid="list-search-results">
                {isSearching && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="space-y-1">
                    {(searchResults as TmdbResult[]).map((result) => (
                      <button
                        key={result.id}
                        className="w-full flex gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors active:bg-accent/80"
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
                        <div className="flex-1 min-w-0 py-1">
                          <p className="font-medium text-sm leading-snug">
                            {result.title}
                            {result.releaseDate && <span className="text-muted-foreground font-normal ml-1">({result.releaseDate.substring(0, 4)})</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground uppercase font-medium">{result.type === "Movie" ? "Film" : "TV"}</span>
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
                  <p className="text-center text-sm text-muted-foreground py-10">No results found</p>
                )}

                {debouncedQuery.length < 2 && (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    Type a movie or show name to search
                  </p>
                )}
              </div>
          ) : selectedItem ? (
            <div className="px-4 py-4 space-y-4">
              <div className="flex gap-3">
                {selectedItem.posterUrl && (
                  <div className="flex-shrink-0 w-20 h-28 rounded-md overflow-hidden">
                    <img src={selectedItem.posterUrl} alt={selectedItem.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight" data-testid="text-selected-title">{selectedItem.title}</h3>
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

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Where to watch</label>
                <Input
                  placeholder="Auto-populated or type platform..."
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  data-testid="input-platform"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Recommended by</label>
                {!showAddFriend ? (
                  <Select value={recommendedBy} onValueChange={(val) => {
                    if (val === "__add_new__") {
                      setShowAddFriend(true);
                    } else {
                      setRecommendedBy(val);
                    }
                  }}>
                    <SelectTrigger className="w-full" data-testid="select-friend">
                      <SelectValue placeholder="Select a friend" />
                    </SelectTrigger>
                    <SelectContent>
                      {friends.map((f: any) => (
                        <SelectItem key={f.id} value={f.name} data-testid={`option-friend-${f.id}`}>
                          {f.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" data-testid="option-add-new-friend">
                        <span className="flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Add new friend
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Friend's name"
                      value={newFriendName}
                      onChange={(e) => setNewFriendName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                      autoFocus
                      autoComplete="off"
                      data-testid="input-new-friend"
                    />
                    <Button size="sm" onClick={handleAddFriend} disabled={!newFriendName.trim() || createFriendMutation.isPending} data-testid="button-save-friend">
                      Add
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddFriend(false)} data-testid="button-cancel-friend">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Watch with</label>
                {watchWith.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2" data-testid="watch-with-pills">
                    {watchWith.map(name => (
                      <span key={name} className="flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium bg-primary text-white">
                        {name}
                        <button
                          type="button"
                          onClick={() => setWatchWith(prev => prev.filter(n => n !== name))}
                          className="w-4 h-4 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center text-white leading-none"
                          data-testid={`remove-watch-with-${name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={watchWithInputRef}
                      placeholder="Add a name and press Enter"
                      value={watchWithInput}
                      onChange={(e) => setWatchWithInput(e.target.value)}
                      onFocus={() => {
                        setTimeout(() => watchWithInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 100);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          if (watchWithSuggestions.length > 0 && !watchWithInput.trim().includes(" ")) {
                            // If there's exactly one suggestion matching, pick it; otherwise add what's typed
                            const exact = watchWithSuggestions.find(n => n.toLowerCase() === watchWithInput.trim().toLowerCase());
                            addWatchWithName(exact ?? watchWithInput);
                          } else if (watchWithInput.trim()) {
                            addWatchWithName(watchWithInput);
                          }
                        }
                      }}
                      autoComplete="off"
                      data-testid="input-watch-with"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addWatchWithName(watchWithInput)}
                      disabled={!watchWithInput.trim()}
                      data-testid="button-add-watch-with"
                    >
                      Add
                    </Button>
                  </div>
                  {/* Autocomplete suggestions */}
                  {watchWithSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-10 mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
                      {watchWithSuggestions.slice(0, 5).map(name => (
                        <button
                          key={name}
                          type="button"
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent active:bg-accent/80"
                          onMouseDown={(e) => {
                            // mouseDown fires before blur — prevent blur from hiding list before click registers
                            e.preventDefault();
                            addWatchWithName(name);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && editItem?.hotRating != null && (
                <div data-testid="edit-hot-rating">
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">My flame rating</label>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const full = hotRating >= i;
                      const half = !full && hotRating >= i - 0.5;
                      return (
                        <span key={i} className="relative inline-block w-7 h-7">
                          <Flame className="w-7 h-7 text-muted-foreground/20" />
                          {(full || half) && (
                            <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "55%" : "100%" }}>
                              <Flame className="w-7 h-7 text-primary fill-primary" />
                            </span>
                          )}
                        </span>
                      );
                    })}
                    <span className="text-sm font-semibold text-primary ml-1">{hotRating}</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={hotRating}
                    onChange={(e) => setHotRating(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                    data-testid="slider-edit-hot-rating"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Comments</label>
                <Textarea
                  placeholder="Any quirky or relevant comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none min-h-[60px]"
                  data-testid="input-notes"
                />
              </div>

              <Button
                onClick={handleAdd}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full"
                data-testid="button-add-to-hotlist"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isEditing ? "Save Changes" : "Add to Hotlist"}
              </Button>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
