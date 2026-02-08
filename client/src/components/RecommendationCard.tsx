import { motion } from "framer-motion";
import { format } from "date-fns";
import { 
  Tv, 
  Film, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  MonitorPlay,
  User,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RecommendationForm } from "./RecommendationForm";
import type { Recommendation } from "@shared/schema";
import { useState } from "react";

interface RecommendationCardProps {
  item: Recommendation;
  onToggleStatus: (id: number, currentStatus: string) => void;
  onDelete: (id: number) => void;
}

export function RecommendationCard({ item, onToggleStatus, onDelete }: RecommendationCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const isWatched = item.status === "Watched";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`
        relative overflow-hidden rounded-2xl p-5
        bg-gradient-to-br from-card to-card/50
        border border-white/5 shadow-lg
        hover:shadow-primary/5 hover:border-primary/20
        group transition-all duration-300
      `}
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />

      <div className="flex justify-between items-start gap-4 mb-3 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge 
              variant="secondary" 
              className={`
                rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold
                ${item.type === 'Movie' 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                  : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}
              `}
            >
              {item.type === 'Movie' ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
              {item.type}
            </Badge>
            {item.platform && (
              <Badge variant="outline" className="rounded-md px-2 py-0.5 text-[10px] text-muted-foreground border-white/10">
                <MonitorPlay className="w-3 h-3 mr-1" />
                {item.platform}
              </Badge>
            )}
          </div>
          <h3 className="text-xl font-bold text-white truncate group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.genre && (
            <p className="text-sm text-muted-foreground mt-0.5">{item.genre}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5 -mr-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-white/10 text-white">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="hover:bg-primary/20 hover:text-primary focus:bg-primary/20 focus:text-primary cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Edit Recommendation</DialogTitle>
                </DialogHeader>
                <RecommendationForm 
                  initialData={item} 
                  onSuccess={() => setIsEditOpen(false)} 
                />
              </DialogContent>
            </Dialog>
            <DropdownMenuItem 
              onClick={() => onDelete(item.id)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(item.notes || item.recommendedBy) && (
        <div className="mt-4 space-y-2 relative z-10">
          {item.notes && (
            <div className="p-3 rounded-lg bg-black/20 text-sm text-muted-foreground italic border border-white/5">
              "{item.notes}"
            </div>
          )}
          {item.recommendedBy && (
            <div className="flex items-center text-xs text-muted-foreground/80">
              <User className="w-3 h-3 mr-1.5" />
              Rec by <span className="font-medium text-white/80 ml-1">{item.recommendedBy}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
        <span className="text-xs text-muted-foreground/60">
          Added {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Recently'}
        </span>
        
        <Button
          size="sm"
          variant={isWatched ? "secondary" : "default"}
          onClick={() => onToggleStatus(item.id, item.status)}
          className={`
            transition-all duration-300 font-medium
            ${isWatched 
              ? 'bg-secondary text-muted-foreground hover:bg-secondary/80' 
              : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40'}
          `}
        >
          {isWatched ? (
            <>Mark as Unwatched</>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Watched
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
