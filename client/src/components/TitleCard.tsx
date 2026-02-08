import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Star, Flame, Tv, Film, GripVertical, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Recommendation } from "@shared/schema";

interface TitleCardProps {
  item: Recommendation;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onOpenDetail: (item: Recommendation) => void;
  onMarkWatched: (item: Recommendation) => void;
}

export function TitleCard({ item, onStatusChange, onDelete, onOpenDetail, onMarkWatched }: TitleCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [seasonCheck, setSeasonCheck] = useState<{ checking: boolean; hasNew: boolean | null; currentSeasons?: number }>({ checking: false, hasNew: null });
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-150, -80], [1, 0]);
  const deleteScale = useTransform(x, [-150, -80], [1, 0.8]);
  const constraintsRef = useRef(null);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
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
      onStatusChange(item.id, status);
    }
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden" data-testid={`card-recommendation-${item.id}`}>
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
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card border-2 border-border/60 rounded-lg cursor-pointer shadow-sm"
        onClick={() => !isDragging && onOpenDetail(item)}
        whileTap={isDragging ? undefined : { scale: 0.98 }}
        data-testid={`card-body-${item.id}`}
      >
        <div className="p-2">
          <div className="flex items-start gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-1" />

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

              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {item.imdbRating && (
                  <span className="flex items-center gap-0.5 text-[11px]" data-testid={`text-rating-${item.id}`}>
                    <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{item.imdbRating}</span>
                  </span>
                )}
                {item.platform && (
                  <span className="text-[11px] text-muted-foreground" data-testid={`text-platform-${item.id}`}>{item.platform}</span>
                )}
                {item.recommendedBy && (
                  <span className="text-[11px] text-primary font-medium" data-testid={`text-recommended-by-${item.id}`}>({item.recommendedBy})</span>
                )}
                {isWatched && item.hotRating && (
                  <span className="flex items-center gap-0.5" data-testid={`rating-hot-${item.id}`}>
                    {Array.from({ length: item.hotRating }).map((_, i) => (
                      <Flame key={i} className="w-2.5 h-2.5 text-primary fill-primary" />
                    ))}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {!isWatched && (
                  <>
                    <Button
                      variant={item.status === "Interested" ? "default" : "outline"}
                      size="sm"
                      className="text-[10px]"
                      onClick={(e) => handleStatusClick(e, "Interested")}
                      data-testid={`button-interested-${item.id}`}
                    >
                      Hot
                    </Button>
                    <Button
                      variant={item.status === "Watching" ? "default" : "outline"}
                      size="sm"
                      className="text-[10px]"
                      onClick={(e) => handleStatusClick(e, "Watching")}
                      data-testid={`button-watching-${item.id}`}
                    >
                      Watching
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px]"
                      onClick={(e) => handleStatusClick(e, "Watched")}
                      data-testid={`button-watched-${item.id}`}
                    >
                      Watched
                    </Button>
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] gap-1"
                            onClick={checkNewSeason}
                            disabled={seasonCheck.checking}
                            data-testid={`button-check-season-${item.id}`}
                          >
                            <RefreshCw className={`w-3 h-3 ${seasonCheck.checking ? "animate-spin" : ""}`} />
                            {seasonCheck.checking ? "" : "New?"}
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px]"
                      onClick={(e) => handleStatusClick(e, "Watching")}
                      data-testid={`button-unwatched-${item.id}`}
                    >
                      Watching
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  data-testid={`button-share-${item.id}`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
