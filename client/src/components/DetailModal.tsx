import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Flame, Clock, Tv, Film, Pencil, X, RefreshCw, MonitorPlay, Play, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Recommendation } from "@shared/schema";

interface DetailModalProps {
  item: Recommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (item: Recommendation) => void;
}

interface TmdbExtras {
  backdropUrl: string | null;
  trailerKey: string | null;
}

interface CommunityData {
  tags: { tag: string; count: number }[];
  reviews: { text: string; author: string }[];
}

function formatRuntime(mins: number | null | undefined): string | null {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

function normalizePlatformDisplay(raw: string): string {
  const first = raw.split(",")[0].trim();
  const s = first.toLowerCase();
  if (s.includes("netflix")) return "Netflix";
  if (s.includes("disney")) return "Disney+";
  if (s.includes("apple tv")) return "Apple TV+";
  if (s.includes("amazon") || s === "prime" || s.includes("prime video")) return "Amazon Prime";
  if (s.includes("stan")) return "Stan";
  if (s.includes("binge")) return "Binge";
  if (s.includes("hbo")) return "HBO";
  if (s.includes("paramount")) return "Paramount+";
  if (s.includes("britbox")) return "BritBox";
  if (s.includes("foxtel")) return "Foxtel Now";
  if (s.includes("sbs")) return "SBS On Demand";
  if (s.includes("abc")) return "ABC iview";
  if (s.includes("kayo")) return "Kayo";
  if (s.includes("hayu")) return "Hayu";
  if (s.includes("7plus") || s.includes("7 plus")) return "7Plus";
  if (s.includes("10 play") || s.includes("10play")) return "10 Play";
  if (s.includes("9now")) return "9Now";
  if (s.includes("mubi")) return "MUBI";
  if (s.includes("docplay")) return "DocPlay";
  return first;
}

export function DetailModal({ item, open, onOpenChange, onEdit }: DetailModalProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const { data: extras } = useQuery<TmdbExtras>({
    queryKey: ["/api/tmdb", item?.tmdbId, item?.type, "extras"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tmdb/${item!.tmdbId}/details?type=${encodeURIComponent(item!.type)}`);
      const d = await res.json();
      return { backdropUrl: d.backdropUrl ?? null, trailerKey: d.trailerKey ?? null };
    },
    enabled: open && !!item?.tmdbId,
    staleTime: 1000 * 60 * 10,
  });

  const { data: community } = useQuery<CommunityData>({
    queryKey: ["/api/community", item?.tmdbId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/community/${item!.tmdbId}`);
      return res.json();
    },
    enabled: open && !!item?.tmdbId,
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    if (!item?.tmdbId) return;
    setRefreshing(true);
    try {
      await apiRequest("POST", `/api/recommendations/${item.id}/refresh-metadata`);
      await queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 3000);
    } catch {}
    setRefreshing(false);
  };

  if (!item) return null;

  const castList = item.cast ? item.cast.split(",").map(c => c.trim()).filter(Boolean) : [];
  const userTags = item.watchTags ? item.watchTags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const runtime = formatRuntime(item.runtime);
  const platformDisplay = item.platform ? normalizePlatformDisplay(item.platform) : null;

  const heroUrl = extras?.backdropUrl || (item.posterUrl ? item.posterUrl.replace("/w342/", "/w780/").replace("/w500/", "/w780/") : null);
  const isBackdrop = !!extras?.backdropUrl;
  const trailerKey = extras?.trailerKey;

  const communityTags = (community?.tags || []).filter(ct => !userTags.some(ut => ut.toLowerCase() === ct.tag.toLowerCase()));
  const communityReviews = community?.reviews || [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setShowTrailer(false); onOpenChange(v); }}>
      <DialogContent
        className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto p-0"
        data-testid="dialog-detail"
        hideCloseButton
      >
        {/* Hero */}
        {heroUrl ? (
          <div className={`relative w-full overflow-hidden rounded-t-lg flex-shrink-0 ${isBackdrop ? "h-52" : "h-64"}`}>
            {showTrailer && trailerKey ? (
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Trailer"
              />
            ) : (
              <>
                <img
                  src={heroUrl}
                  alt={item.title}
                  className={`w-full h-full object-cover ${isBackdrop ? "object-center" : "object-top"}`}
                />
                <div className={`absolute inset-0 ${isBackdrop ? "bg-gradient-to-t from-black/90 via-black/40 to-transparent" : "bg-gradient-to-t from-black/95 via-black/50 to-transparent"}`} />
              </>
            )}

            <button
              onClick={() => { setShowTrailer(false); onOpenChange(false); }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors z-10"
              data-testid="button-close-detail"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Trailer toggle button */}
            {trailerKey && !showTrailer && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors z-10"
                data-testid="button-watch-trailer"
              >
                <Play className="w-3 h-3 fill-white" />
                Trailer
              </button>
            )}
            {showTrailer && (
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors z-10"
                data-testid="button-close-trailer"
              >
                <X className="w-3 h-3" />
                Close
              </button>
            )}

            {!showTrailer && (
              <div className="absolute bottom-4 left-4 right-12">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm" data-testid="badge-detail-type">
                    {item.type === "Movie" ? <Film className="w-3 h-3 mr-1" /> : <Tv className="w-3 h-3 mr-1" />}
                    {item.type}
                  </Badge>
                  {item.censorRating && (
                    <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm">
                      {item.censorRating}
                    </Badge>
                  )}
                  {item.genre && (
                    <span className="text-[11px] text-white/70">{item.genre.split(",")[0].trim()}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg leading-tight" data-testid="text-detail-title">
                  {item.title}
                  {item.releaseDate && (
                    <span className="text-lg font-normal text-white/60 ml-2" data-testid="text-detail-year">
                      {item.releaseDate.substring(0, 4)}
                    </span>
                  )}
                </h2>
              </div>
            )}
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

        <div className="p-5 space-y-5">

          {/* Ratings row */}
          <div className="flex items-center gap-5 flex-wrap">
            {item.imdbRating && (
              <div className="flex items-center gap-1.5" data-testid="text-detail-rating">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-bold">{item.imdbRating}</span>
                <span className="text-xs text-muted-foreground">IMDb</span>
              </div>
            )}
            {item.rtRating != null && (
              <div className="flex items-center gap-1.5" data-testid="text-detail-rt-rating">
                <span className="text-base leading-none">🍅</span>
                <span className="font-bold">{item.rtRating}%</span>
                <span className="text-xs text-muted-foreground">RT</span>
              </div>
            )}
            {runtime && (
              <div className="flex items-center gap-1 text-muted-foreground" data-testid="text-detail-runtime">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm">{runtime}</span>
              </div>
            )}
            {item.seasons && (
              <span className="text-sm text-muted-foreground" data-testid="text-detail-seasons">
                {item.seasons} season{item.seasons > 1 ? "s" : ""}
                {item.episodes ? `, ${item.episodes} eps` : ""}
              </span>
            )}
          </div>

          {/* My flame rating */}
          {item.hotRating && (
            <div className="flex items-center gap-2" data-testid="text-detail-hot-rating">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => {
                  const full = item.hotRating! >= i;
                  const half = !full && item.hotRating! >= i - 0.5;
                  return (
                    <span key={i} className="relative inline-block w-5 h-5">
                      <Flame className="w-5 h-5 text-muted-foreground/20" />
                      {(full || half) && (
                        <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "55%" : "100%" }}>
                          <Flame className="w-5 h-5 text-primary fill-primary" />
                        </span>
                      )}
                    </span>
                  );
                })}
              </span>
              <span className="text-sm font-semibold text-primary">{item.hotRating} / 5</span>
              <span className="text-xs text-muted-foreground">My rating</span>
            </div>
          )}

          {/* My tags */}
          {userTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-testid="detail-watch-tags">
              {userTags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* My review */}
          {item.watchReview && (
            <div className="bg-muted/50 rounded-lg px-4 py-3 border-l-2 border-primary/40" data-testid="detail-watch-review">
              <p className="text-sm text-foreground italic leading-relaxed">"{item.watchReview}"</p>
            </div>
          )}

          {/* Where to watch */}
          {platformDisplay && (
            <div className="flex items-center gap-2.5" data-testid="text-detail-platform">
              <MonitorPlay className="w-4 h-4 text-primary flex-shrink-0" />
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Watch on </span>
                <span className="text-sm font-semibold">{platformDisplay}</span>
              </div>
            </div>
          )}

          {/* Synopsis */}
          {item.overview && (
            <div data-testid="text-detail-overview">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Synopsis</h4>
              <p className="text-sm leading-relaxed text-foreground/90">{item.overview}</p>
            </div>
          )}

          {/* Cast */}
          {castList.length > 0 && (
            <div data-testid="text-detail-cast">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cast</h4>
              <div className="flex flex-wrap gap-1.5">
                {castList.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs font-normal">{name}</Badge>
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

          {/* Community keywords */}
          {communityTags.length > 0 && (
            <div data-testid="detail-community-tags">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hotlist Members Say</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {communityTags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground/80 border border-border"
                    title={`${count} Hotlist member${count !== 1 ? "s" : ""}`}
                    data-testid={`community-tag-${tag}`}
                  >
                    {tag}
                    {count > 1 && <span className="ml-1 text-muted-foreground">×{count}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community reviews */}
          {communityReviews.length > 0 && (
            <div data-testid="detail-community-reviews">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hotlist Reviews</h4>
              </div>
              <div className="space-y-2">
                {communityReviews.map((r, i) => (
                  <div key={i} className="bg-muted/40 rounded-lg px-4 py-3 border border-border/60" data-testid={`community-review-${i}`}>
                    <p className="text-sm italic text-foreground/85 leading-relaxed">"{r.text}"</p>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">— {r.author}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended by + Notes */}
          {(item.recommendedBy || item.notes) && (
            <div className="pt-3 border-t space-y-2" data-testid="text-detail-notes-section">
              {item.recommendedBy && (
                <p className="text-sm" data-testid="text-detail-recommended">
                  Recommended by <span className="font-semibold text-primary">{item.recommendedBy}</span>
                </p>
              )}
              {item.notes && (
                <div data-testid="text-detail-notes">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground italic">"{item.notes}"</p>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {item.tmdbId && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRefresh}
                disabled={refreshing}
                data-testid="button-refresh-metadata"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {refreshed ? "Updated!" : refreshing ? "Refreshing…" : "Refresh Ratings"}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
