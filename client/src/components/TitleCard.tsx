import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Star, Flame, Tv, Film, RefreshCw, GripVertical, CalendarClock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Recommendation } from "@shared/schema";

interface TitleCardProps {
  item: Recommendation;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onOpenDetail: (item: Recommendation) => void;
  onMarkWatched: (item: Recommendation) => void;
  isDragEnabled?: boolean;
  ratingDisplay?: "imdb" | "rt" | "hot" | "friend";
  popularTags?: string[];
}

// Shorten long streaming platform names for compact display
function shortenPlatform(name: string): string {
  const map: Record<string, string> = {
    "Amazon Prime Video": "Amazon",
    "Amazon Prime": "Amazon",
    "Apple TV+": "Apple TV+",
    "Apple TV Plus": "Apple TV+",
    "Google Play Movies & TV": "Google Play",
    "Google Play Movies": "Google Play",
    "Microsoft Store": "Microsoft",
    "Foxtel Now": "Foxtel",
    "Stan.": "Stan",
  };
  return map[name] ?? name;
}

export function TitleCard({ item, onStatusChange, onDelete, onOpenDetail, onMarkWatched, isDragEnabled = false, ratingDisplay = "imdb", popularTags = [] }: TitleCardProps) {
  const [isSwipeDragging, setIsSwipeDragging] = useState(false);
  const [seasonCheck, setSeasonCheck] = useState<{ checking: boolean; hasNew: boolean | null; currentSeasons?: number }>({ checking: false, hasNew: null });
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-150, -80], [1, 0]);
  const deleteScale = useTransform(x, [-150, -80], [1, 0.8]);
  const constraintsRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({ id: item.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isSortDragging ? 50 : undefined,
    opacity: isSortDragging ? 0.85 : 1,
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsSwipeDragging(false);
    if (info.offset.x < -120) {
      onDelete(item.id);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/shared/${item.id}`;
    const text = `Check out "${item.title}"${item.releaseDate ? ` (${item.releaseDate.substring(0, 4)})` : ''}${item.platform ? ` on ${item.platform}` : ''} - add it to your Hotlist!\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (navigator.share) {
      navigator.share({ title: item.title, text, url: shareUrl }).catch(() => {
        window.open(whatsappUrl, '_blank');
      });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const isWatched = item.status === "Watched";
  const isWatchedTvShow = isWatched && item.type === "TV Show" && item.tmdbId;
  const isComingSoon = item.status === "Coming Soon";

  const formatComingDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "Coming Soon";
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "Coming Soon";
    const day = d.getDate();
    const mon = d.toLocaleString("en-AU", { month: "short" });
    return `Coming ${day} ${mon}`;
  };

  // First genre only for compact display
  const firstGenre = item.genre ? item.genre.split(",")[0].trim() : null;

  // First two cast names for compact display
  const topCast = item.cast
    ? item.cast.split(",").map(c => c.trim()).slice(0, 2)
    : [];

  // Format runtime as "1h 54m" or "54m"
  const formatRuntime = (mins: number | null | undefined): string | null => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  };

  const checkNewSeason = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSeasonCheck({ checking: true, hasNew: null });
    try {
      const res = await apiRequest("GET", `/api/recommendations/${item.id}/check-new-season`);
      const data = await res.json();
      setSeasonCheck({ checking: false, hasNew: data.hasNewSeason, currentSeasons: data.currentSeasons });
    } catch {
      setSeasonCheck({ checking: false, hasNew: null });
    }
  };

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    if (status === "Watched") {
      onMarkWatched(item);
    } else {
      // Tapping an already-active status toggles it back to "Want to Watch"
      const newStatus = item.status === status ? "Want to Watch" : status;
      onStatusChange(item.id, newStatus);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      {...attributes}
      className="flex items-stretch gap-1"
      data-testid={`card-recommendation-${item.id}`}
    >
      {isDragEnabled && (
        <div
          {...listeners}
          className="flex items-center px-1 touch-none cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          data-testid={`drag-handle-${item.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div ref={constraintsRef} className="relative overflow-hidden flex-1">
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-6 bg-destructive rounded-lg"
          style={{ opacity: deleteOpacity, scale: deleteScale }}
        >
          <span className="text-white font-bold text-sm">Delete</span>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: -160, right: 0 }}
          dragElastic={0.1}
          dragDirectionLock
          onDragStart={() => setIsSwipeDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="relative bg-card border-2 border-border/60 rounded-lg cursor-pointer shadow-sm"
          onClick={() => !isSwipeDragging && !isSortDragging && onOpenDetail(item)}
          whileTap={isSwipeDragging ? undefined : { scale: 0.98 }}
          data-testid={`card-body-${item.id}`}
        >
          <div className="p-2">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-muted" data-testid={`img-poster-${item.id}`}>
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.type === "Movie" ? (
                      <Film className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Tv className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-foreground text-[13px] leading-tight" data-testid={`text-title-${item.id}`}>
                    {item.title}
                  </h3>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 uppercase font-bold" data-testid={`badge-type-${item.id}`}>
                    {item.type === "Movie" ? "Film" : "TV"}
                  </Badge>
                </div>

                {/* Metadata row: rating, genre, platform, who recommended */}
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {/* Rating slot — switches based on ratingDisplay */}
                  {ratingDisplay === "imdb" && item.imdbRating && (
                    <span className="flex items-center gap-0.5 text-[11px]" data-testid={`text-rating-${item.id}`}>
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{item.imdbRating}</span>
                    </span>
                  )}
                  {ratingDisplay === "rt" && (
                    <span className="flex items-center gap-0.5 text-[11px]" data-testid={`text-rating-${item.id}`}>
                      <span>🍅</span>
                      <span className="font-semibold">{item.rtRating != null ? `${item.rtRating}%` : "—"}</span>
                    </span>
                  )}
                  {ratingDisplay === "hot" && item.hotRating != null && (
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-primary" data-testid={`text-rating-${item.id}`}>
                      🔥 {item.hotRating}
                    </span>
                  )}
                  {ratingDisplay === "friend" && item.recommendedBy && (
                    <span className="text-[11px] text-primary font-semibold" data-testid={`text-rating-${item.id}`}>
                      {item.recommendedBy}
                    </span>
                  )}
                  {firstGenre && (
                    <span className="text-[11px] text-muted-foreground/70" data-testid={`text-genre-${item.id}`}>{firstGenre}</span>
                  )}
                  {item.type === "Movie" && formatRuntime(item.runtime) && (
                    <span className="text-[11px] text-muted-foreground/70" data-testid={`text-runtime-${item.id}`}>{formatRuntime(item.runtime)}</span>
                  )}
                  {item.type === "TV Show" && item.episodes && (
                    <span className="text-[11px] text-muted-foreground/70" data-testid={`text-episodes-${item.id}`}>{item.episodes} eps</span>
                  )}
                  {item.censorRating && (
                    <span className="text-[10px] font-medium px-1 py-0 rounded border border-muted-foreground/30 text-muted-foreground/70 leading-tight" data-testid={`badge-censor-${item.id}`}>{item.censorRating}</span>
                  )}
                  {item.platform && (
                    <span className="text-[11px] text-muted-foreground" data-testid={`text-platform-${item.id}`}>{shortenPlatform(item.platform)}</span>
                  )}
                  {ratingDisplay !== "friend" && item.recommendedBy && (
                    <span className="text-[11px] text-primary font-medium" data-testid={`text-recommended-by-${item.id}`}>({item.recommendedBy})</span>
                  )}
                  {/* Cast folded into metadata row */}
                  {topCast.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/50 truncate" data-testid={`text-cast-${item.id}`}>
                      {topCast.join(" · ")}
                    </span>
                  )}
                </div>

                {/* Community popular tags */}
                {popularTags.length > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap" data-testid={`popular-tags-${item.id}`}>
                    {popularTags.map(tag => (
                      <span key={tag} className="px-1.5 py-0 text-[10px] font-medium rounded-full bg-primary/8 text-primary/70 border border-primary/15">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Hot rating for watched items — supports 0.5 increments */}
                {isWatched && item.hotRating && (
                  <span className="flex items-center gap-0.5 mt-0.5" data-testid={`rating-hot-${item.id}`}>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const full = item.hotRating! >= i;
                      const half = !full && item.hotRating! >= i - 0.5;
                      return (full || half) ? (
                        <span key={i} className="relative inline-block w-2.5 h-2.5">
                          <Flame className="w-2.5 h-2.5 text-muted-foreground/20" />
                          <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "55%" : "100%" }}>
                            <Flame className="w-2.5 h-2.5 text-primary fill-primary" />
                          </span>
                        </span>
                      ) : null;
                    })}
                  </span>
                )}

                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {!isWatched && (
                    <>
                      {isComingSoon && (
                        <button
                          className="h-5 px-2 rounded-full border text-[9px] font-medium transition-colors bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700 flex items-center gap-0.5"
                          onClick={(e) => { e.stopPropagation(); onStatusChange(item.id, "Want to Watch"); }}
                          data-testid={`badge-coming-soon-${item.id}`}
                        >
                          <CalendarClock className="w-2.5 h-2.5" />
                          {formatComingDate(item.releaseDate)}
                        </button>
                      )}
                      {!isComingSoon && (
                        <>
                          <button
                            className={`h-5 px-2 rounded-full border text-[9px] font-medium transition-colors ${
                              item.status === "Interested"
                                ? "bg-primary text-white border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                            onClick={(e) => handleStatusClick(e, "Interested")}
                            data-testid={`button-interested-${item.id}`}
                          >
                            Hot
                          </button>
                          <button
                            className={`h-5 px-2 rounded-full border text-[9px] font-medium transition-colors ${
                              item.status === "Watching"
                                ? "bg-primary text-white border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                            onClick={(e) => handleStatusClick(e, "Watching")}
                            data-testid={`button-watching-${item.id}`}
                          >
                            Watching
                          </button>
                          <button
                            className="h-5 px-2 rounded-full border border-border text-[9px] font-medium text-muted-foreground hover:border-primary/40 transition-colors"
                            onClick={(e) => handleStatusClick(e, "Watched")}
                            data-testid={`button-watched-${item.id}`}
                          >
                            Watched
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {isWatched && (
                    <>
                      {isWatchedTvShow && (
                        <>
                          {seasonCheck.hasNew === true && (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-green-600 border-green-600 animate-pulse" data-testid={`badge-new-season-${item.id}`}>
                              New S{seasonCheck.currentSeasons}!
                            </Badge>
                          )}
                          {seasonCheck.hasNew === false && (
                            <span className="text-[9px] text-muted-foreground" data-testid={`text-no-new-season-${item.id}`}>Up to date</span>
                          )}
                          {seasonCheck.hasNew === null && (
                            <button
                              className="h-5 px-2 rounded-full border border-border text-[9px] font-medium text-muted-foreground hover:border-foreground/40 transition-colors flex items-center gap-0.5"
                              onClick={checkNewSeason}
                              disabled={seasonCheck.checking}
                              data-testid={`button-check-season-${item.id}`}
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${seasonCheck.checking ? "animate-spin" : ""}`} />
                              {seasonCheck.checking ? "" : "New?"}
                            </button>
                          )}
                        </>
                      )}
                      <button
                        className="h-5 px-2 rounded-full border border-border text-[9px] font-medium text-muted-foreground hover:border-foreground/40 transition-colors"
                        onClick={(e) => handleStatusClick(e, "Watching")}
                        data-testid={`button-unwatched-${item.id}`}
                      >
                        Watching
                      </button>
                    </>
                  )}
                  <button
                    className="h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors ml-auto"
                    onClick={handleShare}
                    data-testid={`button-share-${item.id}`}
                  >
                    <Share2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
