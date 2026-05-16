import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Users, Film, Eye, Tag, Star, TrendingUp, Calendar, Tv, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminUserRow {
  userId: string;
  name: string;
  ageRange: string;
  streamingApps: string[];
  joinedAt: string | null;
  totalTitles: number;
  watching: number;
  watched: number;
  tagged: number;
  reviewed: number;
  friends: number;
  lastAdded: string | null;
  loginCount: number;
  lastLogin: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalTitles: number;
  totalWatched: number;
  totalTagged: number;
  totalReviewed: number;
  avgListSize: number;
  users: AdminUserRow[];
  topTitles: { title: string; posterUrl: string | null; type: string; userCount: number }[];
  topTags: { tag: string; count: number }[];
  weeklyAdded: { week: string; count: number }[];
  genreBreakdown: { genre: string; count: number }[];
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-orange-50 text-orange-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" });
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function Admin() {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message + (body.yourUserId ? ` (your ID: ${body.yourUserId})` : ""));
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="font-semibold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-600">{(error as Error).message}</p>
          <p className="text-xs text-gray-400">Set <code className="bg-gray-100 px-1 rounded">ADMIN_USER_IDS</code> in your environment secrets to your user ID above.</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const watchedPct = stats.totalTitles > 0 ? Math.round((stats.totalWatched / stats.totalTitles) * 100) : 0;
  const taggedPct = stats.totalWatched > 0 ? Math.round((stats.totalTagged / stats.totalWatched) * 100) : 0;
  const maxWeekly = Math.max(...stats.weeklyAdded.map(w => w.count), 1);
  const maxGenre = Math.max(...stats.genreBreakdown.map(g => g.count), 1);
  const maxTag = Math.max(...stats.topTags.map(t => t.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-6 py-4 flex items-center gap-3">
        <span className="text-xl">🔥</span>
        <span className="font-bold text-lg tracking-tight">HOTLIST</span>
        <span className="text-gray-400 text-sm ml-1">/ Admin</span>
        <span className="ml-auto text-xs text-gray-400">{user?.email}</span>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Overview cards */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={<Users className="w-4 h-4" />} label="Users" value={stats.totalUsers} />
            <StatCard icon={<Film className="w-4 h-4" />} label="Titles added" value={stats.totalTitles} sub={`avg ${stats.avgListSize} per user`} />
            <StatCard icon={<Eye className="w-4 h-4" />} label="Watched" value={stats.totalWatched} sub={`${watchedPct}% of all titles`} />
            <StatCard icon={<Tag className="w-4 h-4" />} label="Tagged" value={stats.totalTagged} sub={`${taggedPct}% of watched`} />
            <StatCard icon={<Star className="w-4 h-4" />} label="Reviews" value={stats.totalReviewed} />
            <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Avg list" value={stats.avgListSize} sub="titles per user" />
          </div>
        </div>

        {/* Weekly activity chart */}
        {stats.weeklyAdded.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Titles Added — Last 8 Weeks</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-end gap-2 h-28">
                {stats.weeklyAdded.map((w) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700">{w.count}</span>
                    <div
                      className="w-full rounded-t bg-orange-400"
                      style={{ height: `${Math.max(4, (w.count / maxWeekly) * 80)}px` }}
                    />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{w.week}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User table */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Users</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Age</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-right px-4 py-3">List</th>
                  <th className="text-right px-4 py-3">Watching</th>
                  <th className="text-right px-4 py-3">Watched</th>
                  <th className="text-right px-4 py-3">Tagged</th>
                  <th className="text-right px-4 py-3">Friends</th>
                  <th className="text-right px-4 py-3">Last active</th>
                  <th className="text-right px-4 py-3">Logins</th>
                  <th className="text-right px-4 py-3">Last login</th>
                </tr>
              </thead>
              <tbody>
                {stats.users.map((u, i) => (
                  <tr key={u.userId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.ageRange}</td>
                    <td className="px-4 py-2.5 text-gray-500">{fmt(u.joinedAt)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{u.totalTitles}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600">{u.watching || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">{u.watched || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {u.tagged > 0 ? (
                        <span className="text-orange-500">{u.tagged}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{u.friends || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{daysAgo(u.lastAdded)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{u.loginCount || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs">{daysAgo(u.lastLogin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top titles */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Most Popular Titles</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {stats.topTitles.map((t, i) => (
                <div key={t.title} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-bold text-gray-300 w-4 text-right">{i + 1}</span>
                  {t.posterUrl ? (
                    <img src={t.posterUrl} alt={t.title} className="w-7 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-7 h-10 bg-gray-100 rounded flex items-center justify-center">
                      {t.type === "Movie" ? <Film className="w-3 h-3 text-gray-300" /> : <Tv className="w-3 h-3 text-gray-300" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.type}</p>
                  </div>
                  <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                    {t.userCount} {t.userCount === 1 ? "user" : "users"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: tags + genres */}
          <div className="space-y-6">
            {/* Top tags */}
            {stats.topTags.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Tags</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  {stats.topTags.map(t => (
                    <div key={t.tag} className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 w-24 truncate">{t.tag}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${(t.count / maxTag) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 text-right">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Genre breakdown */}
            {stats.genreBreakdown.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Genre Mix</h2>
                <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                  {stats.genreBreakdown.map(g => (
                    <div key={g.genre} className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 w-24 truncate">{g.genre}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full"
                          style={{ width: `${(g.count / maxGenre) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4 text-right">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
