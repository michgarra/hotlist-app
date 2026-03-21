import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Flame, Clock, Tv, Film, Users, Megaphone, Pencil, X } from "lucide-react";
import type { Recommendation } from "@shared/schema";

interface DetailModalProps {
  item: Recommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: Recommendation) => void;
}

export function DetailModal({ item, open, onOpenChange, onEdit }: DetailModalProps) {
  if (!item) return null;

  const castList = item.cast ? item.cast.split(",").map(c => c.trim()).filter(Boolean) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto p-0"
        data-testid="dialog-detail"
        hideCloseButton
      >
        {/* Poster hero with visible close button */}
        {item.posterUrl ? (
          <div className="relative w-full h-56 overflow-hidden rounded-t-md flex-shrink-0">
            <img
              src={item.posterUrl.replace("/w342/", "/w780/")}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            {/* Clearly visible close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              data-testid="button-close-detail"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg" data-testid="text-detail-title">
                {item.title}
                {item.releaseDate && (
                  <span className="text-xl font-normal text-white/70 ml-2" data-testid="text-detail-year">
                    ({item.releaseDate.substring(0, 4)})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0" data-testid="badge-detail-type">
                  {item.type === "Movie" ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
                  {item.type}
                </Badge>
                {item.genre && <span className="text-xs text-white/80">{item.genre}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-xl font-bold" data-testid="text-detail-title-alt">{item.title}</h2>
              {item.releaseDate && (
                <span className="text-sm text-muted-foreground">{item.releaseDate.substring(0, 4)}</span>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors ml-2 flex-shrink-0"
              data-testid="button-close-detail-no-poster"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Ratings and runtime row */}
          <div className="flex items-center gap-4 flex-wrap">
            {item.imdbRating && (
              <div className="flex items-center gap-1" data-testid="text-detail-rating">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-sm">{item.imdbRating}</span>
                <span className="text-xs text-muted-foreground">/10</span>
              </div>
            )}
            {item.hotRating && (
              <div className="flex items-center gap-0.5" data-testid="text-detail-hot-rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Flame
                    key={i}
                    className={`w-4 h-4 ${i < item.hotRating! ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            )}
            {item.runtime && (
              <div className="flex items-center gap-1 text-muted-foreground" data-testid="text-detail-runtime">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{item.runtime} min</span>
              </div>
            )}
            {item.seasons && (
              <span className="text-xs text-muted-foreground" data-testid="text-detail-seasons">
                {item.seasons} season{item.seasons > 1 ? 's' : ''}
                {item.episodes ? `, ${item.episodes} ep${item.episodes > 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>

          {/* Platform */}
          {item.platform && (
            <div className="flex items-center gap-2" data-testid="text-detail-platform">
              <Megaphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Watch on <span className="font-medium">{item.platform}</span></span>
            </div>
          )}

          {/* Synopsis */}
          {item.overview && (
            <div data-testid="text-detail-overview">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Synopsis</h4>
              <p className="text-sm leading-relaxed">{item.overview}</p>
            </div>
          )}

          {/* Cast */}
          {castList.length > 0 && (
            <div data-testid="text-detail-cast">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Cast
              </h4>
              <div className="flex flex-wrap gap-1">
                {castList.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Director */}
          {item.director && (
            <div data-testid="text-detail-director">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Director</h4>
              <p className="text-sm font-medium">{item.director}</p>
            </div>
          )}

          {/* Recommended by + Notes — shown independently */}
          {(item.recommendedBy || item.notes) && (
            <div className="pt-2 border-t space-y-1" data-testid="text-detail-notes-section">
              {item.recommendedBy && (
                <p className="text-xs text-muted-foreground" data-testid="text-detail-recommended">
                  Recommended by <span className="font-medium text-primary">{item.recommendedBy}</span>
                </p>
              )}
              {item.notes && (
                <div data-testid="text-detail-notes">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Notes</h4>
                  <p className="text-sm text-muted-foreground italic">"{item.notes}"</p>
                </div>
              )}
            </div>
          )}

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onEdit(item);
              }}
              data-testid="button-edit-title"
            >
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Edit Details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
