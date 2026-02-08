import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import type { Recommendation } from "@shared/schema";

interface HotRatingDialogProps {
  item: Recommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: number, rating: number) => void;
}

export function HotRatingDialog({ item, open, onOpenChange, onSubmit }: HotRatingDialogProps) {
  const [rating, setRating] = useState(3);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (!item) return null;

  const displayRating = hoveredRating ?? rating;

  const labels = ["", "Skip it", "It was OK", "Worth watching", "Really good", "Must see!"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]" data-testid="dialog-hot-rating">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">Rate "{item.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-sm text-muted-foreground text-center">How hot was it? Give it a flame rating!</p>

          <div className="flex items-center gap-3" data-testid="flame-rating-selector">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className="p-1 transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(i)}
                onMouseLeave={() => setHoveredRating(null)}
                onClick={() => setRating(i)}
                data-testid={`flame-${i}`}
              >
                <Flame
                  className={`w-8 h-8 transition-colors ${
                    i <= displayRating
                      ? 'text-primary fill-primary drop-shadow-[0_0_6px_hsl(24,100%,50%)]'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="text-sm font-medium text-primary h-5" data-testid="text-rating-label">
            {labels[displayRating] || ""}
          </p>

          <div className="w-full space-y-2">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              data-testid="slider-rating"
            />
            <div className="flex justify-between px-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[10px] text-muted-foreground">{i}</span>
              ))}
            </div>
          </div>

          <Button
            onClick={() => onSubmit(item.id, rating)}
            className="w-full"
            data-testid="button-submit-rating"
          >
            <Flame className="w-4 h-4 mr-2" />
            Save Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
