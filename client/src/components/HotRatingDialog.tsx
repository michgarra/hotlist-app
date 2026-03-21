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

const labels: Record<number, string> = {
  0.5: "Barely worth it",
  1: "Skip it",
  1.5: "Almost OK",
  2: "It was OK",
  2.5: "Pretty decent",
  3: "Worth watching",
  3.5: "Really liked it",
  4: "Really good",
  4.5: "Almost perfect",
  5: "Must see!",
};

function FlameBar({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2" data-testid="flame-rating-selector">
      {[1, 2, 3, 4, 5].map((i) => {
        const full = rating >= i;
        const half = !full && rating >= i - 0.5;
        return (
          <span key={i} className="relative inline-block w-9 h-9">
            <Flame className="w-9 h-9 text-muted-foreground/20" />
            {(full || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? "55%" : "100%" }}
              >
                <Flame className="w-9 h-9 text-primary fill-primary drop-shadow-[0_0_6px_hsl(24,100%,50%)]" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function HotRatingDialog({ item, open, onOpenChange, onSubmit }: HotRatingDialogProps) {
  const [rating, setRating] = useState(3);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]" data-testid="dialog-hot-rating">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">Rate "{item.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <p className="text-sm text-muted-foreground text-center">How hot was it? Give it a flame rating!</p>

          <FlameBar rating={rating} />

          <p className="text-sm font-medium text-primary h-5" data-testid="text-rating-label">
            {labels[rating] ?? ""}
          </p>

          <div className="w-full space-y-2">
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              data-testid="slider-rating"
            />
            <div className="flex justify-between px-0.5">
              {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((v) => (
                <span key={v} className="text-[9px] text-muted-foreground/60">
                  {Number.isInteger(v) ? v : ""}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={() => onSubmit(item.id, rating)}
            className="w-full"
            data-testid="button-submit-rating"
          >
            <Flame className="w-4 h-4 mr-2" />
            Save Rating ({rating} 🔥)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
