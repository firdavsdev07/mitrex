"use client";

import { useState, useEffect } from "react";
import {
  FileText, Eye, Heart, MessageCircle,
  Share2, TrendingUp, Users, BarChart2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  YouTubeIcon, TelegramIcon, InstagramIcon,
} from "@/components/icons/platform-icons";
import { connectionsApi } from "@/lib/api/connections";

// ─── types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  title: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  url: string | null;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  dislikes: number | null;
  comments: number | null;
  shares: number | null;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
}

type SortMetric = "views" | "likes" | "comments" | "engagementRate";

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TELEGRAM: "Telegram",
  INSTAGRAM: "Instagram",
};

const SORT_OPTIONS: { value: SortMetric; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: "views",         label: "Ko'rishlar",  icon: Eye        },
  { value: "likes",         label: "Likelar",     icon: Heart      },
  { value: "comments",      label: "Izohlar",     icon: MessageCircle },
  { value: "engagementRate",label: "Engagement",  icon: TrendingUp },
];

function fmt(n: number | null) {
  if (n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, value, color = "text-zinc-500" }: {
  icon: React.FC<{ className?: string }>;
  value: string | null;
  color?: string;
}) {
  if (value === null) return null;
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{value}</span>
    </span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PostsPage() {
  const [activePlatform, setActivePlatform] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [sortMetric, setSortMetric] = useState<SortMetric>("views");
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load connected platforms
  useEffect(() => {
    connectionsApi.list().then((conns) => {
      const platforms = conns
        .map((c) => c.platform)
        .filter((p) => ["YOUTUBE", "TELEGRAM", "INSTAGRAM"].includes(p));
      setConnectedPlatforms(platforms);
      if (platforms.length > 0) setActivePlatform(platforms[0]);
      else setLoading(false);
    });
  }, []);

  // Load posts when platform or sort changes
  useEffect(() => {
    if (!activePlatform) return;
    setLoading(true);
    apiClient
      .get<{ posts: Post[]; total: number; username: string | null }>(
        `/connections/${activePlatform}/posts`,
        { params: { limit: 20 } }
      )
      .then((res) => {
        setPosts(res.data.posts);
        setTotal(res.data.total);
        setUsername(res.data.username);
      })
      .catch(() => { setPosts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [activePlatform]);

  // Client-side sort
  const sorted = [...posts].sort((a, b) => {
    const av = a[sortMetric] ?? -1;
    const bv = b[sortMetric] ?? -1;
    return bv - av;
  });

  const Icon = PLATFORM_ICONS[activePlatform];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Kontent</p>
          <h1 className="text-lg font-semibold text-zinc-100">Postlar</h1>
          {username && activePlatform && (
            <p className="text-xs text-zinc-600 mt-0.5">
              @{username} · {total} ta post
            </p>
          )}
        </div>
      </div>

      {/* Platform tabs */}
      {connectedPlatforms.length > 0 && (
        <div className="flex items-center gap-1 mb-4 border-b border-zinc-800">
          {connectedPlatforms.map((p) => {
            const PIcon = PLATFORM_ICONS[p];
            return (
              <button
                key={p}
                onClick={() => setActivePlatform(p)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
                  activePlatform === p
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {PIcon && <PIcon className="w-3.5 h-3.5" />}
                {PLATFORM_LABELS[p] ?? p}
              </button>
            );
          })}
        </div>
      )}

      {/* Sort tabs */}
      {posts.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          <span className="text-xs text-zinc-600 mr-1">Saralash:</span>
          {SORT_OPTIONS.map(({ value, label, icon: SIcon }) => (
            <button
              key={value}
              onClick={() => setSortMetric(value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                sortMetric === value
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  : "text-zinc-600 hover:text-zinc-300 border border-transparent"
              }`}
            >
              <SIcon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!connectedPlatforms.length ? (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-1">Hali platforma ulanmagan</p>
          <p className="text-xs text-zinc-700">YouTube, Telegram yoki Instagram ulang</p>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">
            {PLATFORM_LABELS[activePlatform]} uchun post topilmadi
          </p>
          <p className="text-xs text-zinc-700 mt-1">Sync qilib ko'ring</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {post.thumbnailUrl ? (
                      <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      Icon && <Icon className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Title + date */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-zinc-200 hover:text-white truncate block transition-colors"
                          >
                            {post.title ?? post.caption?.slice(0, 80) ?? "Nomsiz post"}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-zinc-200 truncate">
                            {post.title ?? post.caption?.slice(0, 80) ?? "Nomsiz post"}
                          </p>
                        )}
                        {post.publishedAt && (
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {new Date(post.publishedAt).toLocaleDateString("uz-UZ")}
                          </p>
                        )}
                      </div>
                      {post.engagementRate !== null && (
                        <Badge variant="orange" className="shrink-0">
                          {post.engagementRate.toFixed(1)}% eng
                        </Badge>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <StatChip icon={Eye}           value={fmt(post.views)}       color="text-zinc-400" />
                      <StatChip icon={Heart}          value={fmt(post.likes)}       color="text-red-400"  />
                      {post.dislikes !== null && post.dislikes > 0 && (
                        <StatChip icon={TrendingUp}   value={`-${fmt(post.dislikes)}`} color="text-zinc-600" />
                      )}
                      <StatChip icon={MessageCircle}  value={fmt(post.comments)}    color="text-blue-400" />
                      <StatChip icon={Share2}          value={fmt(post.shares)}      color="text-green-400" />
                      {post.reach !== null && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Users className="w-3.5 h-3.5" />
                          <span>{fmt(post.reach)} reach</span>
                        </span>
                      )}
                      {post.impressions !== null && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>{fmt(post.impressions)} imp</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
