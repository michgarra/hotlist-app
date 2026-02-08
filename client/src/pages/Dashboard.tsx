import { useState } from "react";
import { useRecommendations, useUpdateRecommendation, useDeleteRecommendation } from "@/hooks/use-recommendations";
import { RecommendationCard } from "@/components/RecommendationCard";
import { RecommendationForm } from "@/components/RecommendationForm";
import { StatsOverview } from "@/components/StatsOverview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Clapperboard, Filter, Flame, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { data: items = [], isLoading } = useRecommendations();
  const updateMutation = useUpdateRecommendation();
  const deleteMutation = useDeleteRecommendation();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "Watched" ? "To Watch" : "Watched";
    updateMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this from your list?")) {
      deleteMutation.mutate(id);
    }
  };

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.genre?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesPlatform = platformFilter === "all" || 
                            (item.platform && item.platform.toLowerCase().includes(platformFilter.toLowerCase()));
    
    return matchesSearch && matchesType && matchesPlatform;
  });

  const toWatchItems = filteredItems.filter(i => i.status !== "Watched");
  const watchedItems = filteredItems.filter(i => i.status === "Watched");

  // Get unique platforms for filter
  const uniquePlatforms = Array.from(new Set(items.map(i => i.platform).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Clapperboard className="w-6 h-6 text-primary/80" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header / Hero Section */}
      <div className="bg-gradient-to-b from-card to-background border-b border-white/5 pt-12 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Flame className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight text-white">
                  The <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Hotlist</span>
                </h1>
              </motion.div>
              <p className="text-muted-foreground max-w-lg text-lg ml-1">
                Your curated collection of must-see entertainment.
              </p>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-xl h-12 px-6 text-base">
                  <Plus className="mr-2 h-5 w-5" />
                  Add Recommendation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card border-white/10 text-white p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-display">Add to Library</DialogTitle>
                </DialogHeader>
                <RecommendationForm onSuccess={() => setIsAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <StatsOverview items={items} />

          {/* Search & Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 bg-card/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search title, genre..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 h-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-background/50 border-white/10 h-10">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder="Type" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Movie">Movies</SelectItem>
                  <SelectItem value="TV Show">TV Shows</SelectItem>
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-[160px] bg-background/50 border-white/10 h-10">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-white/10">
                  <SelectItem value="all">All Platforms</SelectItem>
                  {uniquePlatforms.map((p) => (
                    <SelectItem key={p} value={p as string}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="hotlist" className="w-full">
          <TabsList className="bg-card/50 border border-white/5 p-1 rounded-xl w-full max-w-md mx-auto grid grid-cols-2 mb-8">
            <TabsTrigger 
              value="hotlist"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all py-2.5"
            >
              Hotlist <Badge className="ml-2 bg-white/20 hover:bg-white/20 border-0">{toWatchItems.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="watched"
              className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-white transition-all py-2.5"
            >
              Watched <Badge variant="secondary" className="ml-2 bg-black/20 hover:bg-black/20 border-0">{watchedItems.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hotlist" className="mt-0">
            <AnimatePresence mode="popLayout">
              {toWatchItems.length === 0 ? (
                <EmptyState type="hotlist" onAdd={() => setIsAddOpen(true)} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {toWatchItems.map((item) => (
                    <RecommendationCard 
                      key={item.id} 
                      item={item} 
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="watched" className="mt-0">
            <AnimatePresence mode="popLayout">
              {watchedItems.length === 0 ? (
                <EmptyState type="watched" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
                  {watchedItems.map((item) => (
                    <RecommendationCard 
                      key={item.id} 
                      item={item} 
                      onToggleStatus={handleToggleStatus}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmptyState({ type, onAdd }: { type: 'hotlist' | 'watched', onAdd?: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-card/20"
    >
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        {type === 'hotlist' ? (
          <Clapperboard className="w-10 h-10 text-muted-foreground" />
        ) : (
          <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        {type === 'hotlist' ? "Your list is empty" : "No watched items yet"}
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {type === 'hotlist' 
          ? "Start building your queue by adding movies and shows recommended by your friends." 
          : "Items you mark as watched will appear here to help you keep track of what you've seen."}
      </p>
      {type === 'hotlist' && onAdd && (
        <Button onClick={onAdd} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
          Add your first item
        </Button>
      )}
    </motion.div>
  );
}
