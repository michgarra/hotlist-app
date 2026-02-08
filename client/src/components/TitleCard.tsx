import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Star, Flame, Tv, Film, GripVertical } from "lucide-react";
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
    const text = `Check out "${item.title}" ${item.platform ? `on ${item.platform}` : ''} - recommended on Hotlist!`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (navigator.share) {
      navigator.share({ title: item.title, text }).catch(() => {
        window.open(whatsappUrl, '_blank');
      });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const isWatched = item.status === "Watched";

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
        <div className="flex items-center gap-2 p-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />

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
              <h3 className="font-bold text-foreground text-[13px] leading-tight truncate" data-testid={`text-title-${item.id}`}>
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
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isWatched && (
              <>
                <Button
                  variant={item.status === "Interested" ? "default" : "outline"}
                  size="sm"
                  className="text-[10px]"
                  onClick={(e) => handleStatusClick(e, "Interested")}
                  data-testid={`button-interested-${item.id}`}
                >
                  Int
                </Button>
                <Button
                  variant={item.status === "Watching" ? "default" : "outline"}
                  size="sm"
                  className="text-[10px]"
                  onClick={(e) => handleStatusClick(e, "Watching")}
                  data-testid={`button-watching-${item.id}`}
                >
                  Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px]"
                  onClick={(e) => handleStatusClick(e, "Watched")}
                  data-testid={`button-watched-${item.id}`}
                >
                  Done
                </Button>
              </>
            )}
            {isWatched && (
              <Button
                variant="outline"
                size="sm"
                className="text-[10px]"
                onClick={(e) => handleStatusClick(e, "Want to Watch")}
                data-testid={`button-unwatched-${item.id}`}
              >
                Undo
              </Button>
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
      </motion.div>
    </div>
  );
}
