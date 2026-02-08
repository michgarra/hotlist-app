import { motion } from "framer-motion";
import { type Recommendation } from "@shared/schema";
import { Film, Tv, CheckCircle2 } from "lucide-react";

interface StatsOverviewProps {
  items: Recommendation[];
}

export function StatsOverview({ items }: StatsOverviewProps) {
  const total = items.length;
  const watched = items.filter(i => i.status === "Watched").length;
  const movies = items.filter(i => i.type === "Movie").length;
  const shows = items.filter(i => i.type === "TV Show").length;

  const stats = [
    { label: "Total List", value: total, icon: null },
    { label: "Watched", value: watched, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Movies", value: movies, icon: Film, color: "text-amber-400" },
    { label: "TV Shows", value: shows, icon: Tv, color: "text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-card/60 transition-colors"
        >
          <div className="text-3xl font-display font-bold text-white mb-1">
            {stat.value}
          </div>
          <div className={`text-xs uppercase tracking-wider font-medium flex items-center gap-1.5 ${stat.color || "text-muted-foreground"}`}>
            {stat.icon && <stat.icon className="w-3 h-3" />}
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
