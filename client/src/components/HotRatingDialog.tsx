import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Recommendation } from "@shared/schema";

interface HotRatingDialogProps {
  item: Recommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: number, rating: number, tags: string[], review: string) => void;
}

const WORD_BANK = [
  "Fresh", "Dark", "Quirky", "Gritty", "Raw",
  "Moving", "Funny", "Scary", "Tense", "Heartwarming",
  "Tearjerker", "Uplifting", "Unsettling", "Feel-good", "Brilliant",
  "Gripping", "Clever", "Mind-blowing", "Unmissable", "Binge-worthy",
  "Forgettable", "Slow", "Predictable", "Shocking", "Thought-provoking",
  "Nostalgic", "Intense", "Rewatchable", "Surprising", "Stylish",
];

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

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

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
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "55%" : "100%" }}>
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customWord, setCustomWord] = useState("");
  const [review, setReview] = useState("");
  const [showReview, setShowReview] = useState(false);

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setRating(3);
      setSelectedTags([]);
      setCustomWord("");
      setReview("");
      setShowReview(false);
    }
    onOpenChange(val);
  };

  const toggleTag = (word: string) => {
    setSelectedTags(prev =>
      prev.includes(word)
        ? prev.filter(t => t !== word)
        : prev.length < 3 ? [...prev, word] : prev
    );
  };

  const addCustomWord = () => {
    const word = customWord.trim();
    if (!word || selectedTags.length >= 3 || selectedTags.includes(word)) return;
    setSelectedTags(prev => [...prev, word]);
    setCustomWord("");
  };

  const wordCount = countWords(review);
  const overLimit = wordCount > 200;

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] max-h-[90dvh] overflow-y-auto" data-testid="dialog-hot-rating">
        <DialogHeader>
          <DialogTitle className="text-center text-base leading-snug">Rate "{item.title}"</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 pb-2">
          {/* Flame rating */}
          <FlameBar rating={rating} />
          <p className="text-sm font-medium text-primary h-4" data-testid="text-rating-label">
            {labels[rating] ?? ""}
          </p>
          <div className="w-full space-y-1.5">
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

          {/* Word picker */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Describe it in 3 words
              </p>
              <span className="text-[11px] text-muted-foreground">{selectedTags.length}/3</span>
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="word-bank">
              {WORD_BANK.map(word => {
                const selected = selectedTags.includes(word);
                const disabled = !selected && selectedTags.length >= 3;
                return (
                  <button
                    key={word}
                    onClick={() => toggleTag(word)}
                    disabled={disabled}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                      selected
                        ? "bg-primary text-white border-primary"
                        : disabled
                          ? "border-border text-muted-foreground/30 cursor-not-allowed"
                          : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    }`}
                    data-testid={`tag-${word.toLowerCase()}`}
                  >
                    {word}
                  </button>
                );
              })}
              {/* Custom word input */}
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  placeholder="Your word…"
                  value={customWord}
                  onChange={e => setCustomWord(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomWord()}
                  maxLength={20}
                  disabled={selectedTags.length >= 3}
                  className="h-6 px-2 text-[11px] rounded-full border border-dashed border-border bg-transparent placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary w-24 disabled:opacity-30"
                  data-testid="input-custom-word"
                />
                <button
                  onClick={addCustomWord}
                  disabled={!customWord.trim() || selectedTags.length >= 3}
                  className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-colors disabled:opacity-30"
                  data-testid="button-add-custom-word"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                {selectedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary text-white border border-primary flex items-center gap-1"
                    data-testid={`selected-tag-${tag.toLowerCase()}`}
                  >
                    {tag} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add thoughts toggle */}
          <div className="w-full space-y-2">
            <button
              onClick={() => setShowReview(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-review"
            >
              {showReview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showReview ? "Hide thoughts" : "+ Add your thoughts"}
            </button>
            {showReview && (
              <div className="space-y-1">
                <textarea
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  placeholder="What made it memorable? Would you recommend it?"
                  rows={4}
                  className={`w-full text-sm rounded-lg border px-3 py-2 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary ${
                    overLimit ? "border-destructive focus:ring-destructive" : "border-border"
                  }`}
                  data-testid="textarea-review"
                />
                <p className={`text-[11px] text-right ${overLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {wordCount}/200 words
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={() => onSubmit(item.id, rating, selectedTags, review.trim())}
            className="w-full"
            disabled={overLimit}
            data-testid="button-submit-rating"
          >
            <Flame className="w-4 h-4 mr-2" />
            Save Rating ({rating} 🔥){selectedTags.length > 0 ? ` · ${selectedTags.length} tags` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
