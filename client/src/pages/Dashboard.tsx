import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useRecommendations, useUpdateRecommendation, useDeleteRecommendation } from "@/hooks/use-recommendations";
import { TitleCard } from "@/components/TitleCard";
import { AddTitleSheet } from "@/components/AddTitleSheet";
import { HotRatingDialog } from "@/components/HotRatingDialog";
import { DetailModal } from "@/components/DetailModal";
import { HotlistChart } from "@/components/HotlistChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Flame, Plus, Search, Filter, Loader2, LogOut, Users, X, Trash2 } from "lucide-react";
import { useFriends, useCreateFriend } from "@/hooks/use-recommendations";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import flameLogo from "@/assets/flame-logo.png";
import type { Recommendation, Friend } from "@shared/schema";

type ActiveTab = "mylist" | "hotlist" | "watched";

export default function Dashboard() {
  const { data: serverItems = [], isLoading } = useRecommendations() as { data: Recommendation[], isLoading: boolean };
  const updateMutation = useUpdateRecommendation();
  const deleteMutation = useDeleteRecommendation();
  const { user, logout } = useAuth();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [friendFilter, setFriendFilter] = useState("all");
  const [hotRatingFilter, setHotRatingFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("mylist");

  const [hotRatingItem, setHotRatingItem] = useState<Recommendation | null>(null);
  const [detailItem, setDetailItem] = useState<Recommendation | null>(null);
  const [editItem, setEditItem] = useState<Recommendation | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const { data: friendsList = [] } = useFriends() as { data: Friend[] };
  const createFriend = useCreateFriend();

  // Local ordered ID lists for optimistic drag-and-drop reordering
  const [myListIds, setMyListIds] = useState<number[]>([]);
  const [watchedIds, setWatchedIds] = useState<number[]>([]);

  // Sync ordered IDs from server whenever server data changes
  useEffect(() => {
    if (!isLoading) {
      setMyListIds(serverItems.filter(i => i.status !== "Watched").map(i => i.id));
      setWatchedIds(serverItems.filter(i => i.status === "Watched").map(i => i.id));
    }
  }, [serverItems, isLoading]);

  // Build ordered item arrays using local ID order for optimistic display
  const items = useMemo(() => {
    const itemMap = new Map(serverItems.map(i => [i.id, i]));
    const myList = myListIds.map(id => itemMap.get(id)).filter(Boolean) as Recommendation[];
    const watched = watchedIds.map(id => itemMap.get(id)).filter(Boolean) as Recommendation[];
    return { myList, watched };
  }, [serverItems, myListIds, watchedIds]);

  const hasActiveFilters = !!(
    search ||
    typeFilter !== "all" ||
    genreFilter !== "all" ||
    platformFilter !== "all" ||
    friendFilter !== "all" ||
    hotRatingFilter !== "all"
  );

  // dnd-kit sensors — pointer with a small movement threshold, touch with delay to avoid conflict with scroll
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = Number(active.id);
    const overId = Number(over.id);

    if (activeTab === "mylist") {
      const oldIndex = myListIds.indexOf(activeId);
      const newIndex = myListIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const newIds = arrayMove(myListIds, oldIndex, newIndex);
      setMyListIds(newIds);
      apiRequest("POST", "/api/recommendations/reorder", { orderedIds: newIds });
    } else if (activeTab === "watched") {
      const oldIndex = watchedIds.indexOf(activeId);
      const newIndex = watchedIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;
      const newIds = arrayMove(watchedIds, oldIndex, newIndex);
      setWatchedIds(newIds);
      apiRequest("POST", "/api/recommendations/reorder", { orderedIds: newIds });
    }
  }, [activeTab, myListIds, watchedIds]);

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, status });
  };

  const handleMarkWatched = (item: Recommendation) => {
    setHotRatingItem(item);
  };

  const handleHotRatingSubmit = (id: number, rating: number) => {
    const item = serverItems.find((i: Recommendation) => i.id === id);
    const lastKnownSeasons = item?.type === "TV Show" && item?.seasons ? item.seasons : undefined;
    updateMutation.mutate({ id, status: "Watched", hotRating: rating, ...(lastKnownSeasons ? { lastKnownSeasons } : {}) });
    setHotRatingItem(null);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const uniqueGenres = useMemo(() => {
    const genres = new Set<string>();
    serverItems.forEach((i: Recommendation) => {
      if (i.genre) i.genre.split(",").forEach(g => genres.add(g.trim()));
    });
    return Array.from(genres).sort();
  }, [serverItems]);

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(serverItems.map((i: Recommendation) => i.platform).filter(Boolean))).sort() as string[];
  }, [serverItems]);

  const uniqueFriends = useMemo(() => {
    return Array.from(new Set(serverItems.map((i: Recommendation) => i.recommendedBy).filter(Boolean))).sort() as string[];
  }, [serverItems]);

  const applyFilters = (list: Recommendation[]) => list.filter((item: Recommendation) => {
    const matchesSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.genre && item.genre.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesGenre = genreFilter === "all" || (item.genre && item.genre.includes(genreFilter));
    const matchesPlatform = platformFilter === "all" || item.platform === platformFilter;
    const matchesFriend = friendFilter === "all" || item.recommendedBy === friendFilter;
    const matchesHotRating = hotRatingFilter === "all" || (item.hotRating && item.hotRating >= Number(hotRatingFilter));
    return matchesSearch && matchesType && matchesGenre && matchesPlatform && matchesFriend && matchesHotRating;
  });

  const myListItems = useMemo(() => applyFilters(items.myList), [items.myList, search, typeFilter, genreFilter, platformFilter, friendFilter]);
  const watchedItems = useMemo(() => applyFilters(items.watched), [items.watched, search, typeFilter, genreFilter, platformFilter, friendFilter, hotRatingFilter]);
  const displayItems = activeTab === "mylist" ? myListItems : watchedItems;
  const displayIds = displayItems.map(i => i.id);

  // Drag enabled only when no filters active (reordering a subset is confusing)
  const isDragEnabled = !hasActiveFilters && activeTab !== "hotlist";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="page-dashboard">
      <header className="sticky top-0 z-50 bg-black text-white" data-testid="header-main">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src={flameLogo} alt="Hotlist flame" className="w-10 h-10 object-contain" />
            <h1 className="text-lg font-bold tracking-tight">HOTLIST</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white/80" onClick={() => setShowFriends(true)} data-testid="button-friends">
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white/80" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
            {user && (
              <Avatar className="w-7 h-7 ml-1" data-testid="avatar-user">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-white">
                  {(user.firstName?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        <div className="flex border-b" data-testid="tabs-main">
          <button
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors relative ${
              activeTab === "mylist" ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("mylist")}
            data-testid="tab-mylist"
          >
            My List ({myListItems.length})
            {activeTab === "mylist" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors relative ${
              activeTab === "hotlist" ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("hotlist")}
            data-testid="tab-hotlist"
          >
            <span className="flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              HOTLIST
            </span>
            {activeTab === "hotlist" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            className={`flex-1 py-3 text-xs font-semibold text-center transition-colors relative ${
              activeTab === "watched" ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("watched")}
            data-testid="tab-watched"
          >
            Watched ({watchedItems.length})
            {activeTab === "watched" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
          </button>
        </div>

        {activeTab === "hotlist" ? (
          <HotlistChart />
        ) : (
          <>
            <div className="px-3 py-2 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search titles, genres..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                    data-testid="input-search"
                  />
                </div>
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              {showFilters && (
                <div className="flex gap-2 flex-wrap" data-testid="filters-panel">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[110px] h-8 text-xs" data-testid="filter-type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Movie">Movies</SelectItem>
                      <SelectItem value="TV Show">TV Shows</SelectItem>
                    </SelectContent>
                  </Select>

                  {uniqueGenres.length > 0 && (
                    <Select value={genreFilter} onValueChange={setGenreFilter}>
                      <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="filter-genre">
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genres</SelectItem>
                        {uniqueGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {uniquePlatforms.length > 0 && (
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="filter-platform">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        {uniquePlatforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {uniqueFriends.length > 0 && (
                    <Select value={friendFilter} onValueChange={setFriendFilter}>
                      <SelectTrigger className="w-[110px] h-8 text-xs" data-testid="filter-friend">
                        <SelectValue placeholder="Friend" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Friends</SelectItem>
                        {uniqueFriends.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  {activeTab === "watched" && (
                    <Select value={hotRatingFilter} onValueChange={setHotRatingFilter}>
                      <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="filter-hot-rating">
                        <SelectValue placeholder="Hot Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Flames</SelectItem>
                        <SelectItem value="4">4+ Flames</SelectItem>
                        <SelectItem value="3">3+ Flames</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 px-3 pb-24 space-y-1.5" data-testid="list-recommendations">
              {displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Flame className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="font-medium text-muted-foreground">
                    {activeTab === "mylist" ? "Your list is empty" : "No watched titles yet"}
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1 max-w-xs">
                    {activeTab === "mylist"
                      ? "Tap + below to add movies and shows recommended by friends"
                      : "Mark items as Watched and rate them to see them here"}
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={displayIds} strategy={verticalListSortingStrategy}>
                    {hasActiveFilters && (
                      <p className="text-[10px] text-muted-foreground/50 text-center py-1" data-testid="text-drag-hint">
                        Clear filters to reorder
                      </p>
                    )}
                    {displayItems.map((item: Recommendation) => (
                      <TitleCard
                        key={item.id}
                        item={item}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onOpenDetail={setDetailItem}
                        onMarkWatched={handleMarkWatched}
                        isDragEnabled={isDragEnabled}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </>
        )}
      </div>

      {activeTab !== "hotlist" && (
        <div className="fixed bottom-6 right-6 z-40 sm:right-[calc(50%-14rem)]" data-testid="fab-add">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
            onClick={() => setIsAddOpen(true)}
            data-testid="button-add-title"
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      )}

      <AddTitleSheet
        open={isAddOpen || !!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditItem(null);
          } else {
            setIsAddOpen(true);
          }
        }}
        editItem={editItem}
      />
      <HotRatingDialog
        item={hotRatingItem}
        open={!!hotRatingItem}
        onOpenChange={(open) => !open && setHotRatingItem(null)}
        onSubmit={handleHotRatingSubmit}
      />
      <DetailModal
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        onEdit={(item) => {
          setDetailItem(null);
          setEditItem(item);
        }}
      />

      {showFriends && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowFriends(false)} data-testid="overlay-friends">
          <div className="bg-card w-full max-w-lg rounded-t-xl p-4 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()} data-testid="panel-friends">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-bold text-base">My Friends</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFriends(false)} data-testid="button-close-friends">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form
              className="flex gap-2 mb-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (newFriendName.trim()) {
                  createFriend.mutate(newFriendName.trim());
                  setNewFriendName("");
                }
              }}
              data-testid="form-add-friend"
            >
              <Input
                placeholder="Add a friend..."
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                className="flex-1"
                data-testid="input-friend-name"
              />
              <Button type="submit" size="sm" disabled={!newFriendName.trim()} data-testid="button-add-friend">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
            <div className="overflow-y-auto flex-1">
              {friendsList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-friends">No friends added yet</p>
              ) : (
                <ul className="space-y-1">
                  {friendsList.map((f: Friend) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 py-2 px-2 rounded-md" data-testid={`friend-item-${f.id}`}>
                      <span className="text-sm font-medium">{f.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          await fetch(`/api/friends/${f.id}`, { method: "DELETE" });
                          createFriend.reset();
                          (await import("@/lib/queryClient")).queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
                        }}
                        data-testid={`button-delete-friend-${f.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
