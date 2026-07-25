'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  BlueskyIcon,
} from '@/components/icons/platform-icons';
import { connectionsApi, type Connection } from '@/lib/api/connections';
import { postsApi, type Post, type SortMetric } from '@/lib/api/posts';
import { PostCard } from '@/components/posts/post-card';

// ─── config ───────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  BLUESKY: BlueskyIcon,
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  BLUESKY: 'Bluesky',
};

// Bluesky'da haqiqiy "ko'rishlar" ma'lumoti yo'q (views har doim null) —
// shuning uchun standart saralash likelar bo'yicha, qolganlarida views bo'yicha.
const DEFAULT_SORT: Record<string, SortMetric> = {
  YOUTUBE: 'views',
  TELEGRAM: 'views',
  INSTAGRAM: 'views',
  BLUESKY: 'likes',
};

// "follows" (post orqali qo'shilgan obunachilar) hozircha faqat Instagram
// FEED postlarida mavjud — shuning uchun boshqa platformalarda ko'rsatilmaydi.
const SORT_OPTIONS: {
  value: SortMetric;
  label: string;
  icon: React.FC<{ className?: string }>;
  platforms?: string[];
}[] = [
  { value: 'views', label: "Ko'rishlar", icon: Eye },
  {
    value: 'follows',
    label: 'Obunachilar',
    icon: UserPlus,
    platforms: ['INSTAGRAM', 'YOUTUBE'],
  },
  { value: 'likes', label: 'Likelar', icon: Heart },
  { value: 'comments', label: 'Izohlar', icon: MessageCircle },
  { value: 'engagementRate', label: 'Engagement', icon: TrendingUp },
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PostsPage() {
  // Bitta platformada bir nechta ulanish bo'lishi mumkin (masalan 2 ta
  // Telegram kanal), shuning uchun tablar platform emas — har bir aniq
  // ulanish (connection) bo'yicha.
  const [activeConnId, setActiveConnId] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [sortMetric, setSortMetric] = useState<SortMetric>('views');
  const [posts, setPosts] = useState<Post[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeConn = connections.find((c) => c.id === activeConnId);
  const activePlatform = activeConn?.platform ?? '';

  // Load connections
  useEffect(() => {
    connectionsApi
      .list()
      .then((conns) => {
        const supported = conns.filter(
          (c) => c.isActive && Object.keys(PLATFORM_LABELS).includes(c.platform),
        );
        setConnections(supported);
        if (supported.length > 0) setActiveConnId(supported[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Ulanish almashganda standart saralash metrikasini o'rnatish
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    if (activePlatform) setSortMetric(DEFAULT_SORT[activePlatform] ?? 'views');
  }, [activePlatform]);

  // Load posts when active connection changes
  useEffect(() => {
    if (!activeConnId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    setLoading(true);
    postsApi
      .list(activeConnId, 50)
      .then((res) => {
        setPosts(res.posts);
        setTotal(res.total);
        setUsername(res.username);
      })
      .catch(() => {
        setPosts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [activeConnId]);

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
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
            Kontent
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">Postlar</h1>
          {username && activeConnId && (
            <p className="text-xs text-zinc-600 mt-0.5">
              @{username} · {total} ta post
            </p>
          )}
        </div>
      </div>

      {/* Connection tabs */}
      {connections.length > 0 && (
        <div className="flex items-center gap-1 mb-4 border-b border-zinc-800 flex-wrap">
          {connections.map((c) => {
            const PIcon = PLATFORM_ICONS[c.platform];
            return (
              <button
                key={c.id}
                onClick={() => setActiveConnId(c.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
                  activeConnId === c.id
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {PIcon && <PIcon className="w-3.5 h-3.5" />}
                {PLATFORM_LABELS[c.platform] ?? c.platform}
                {c.platformUsername && (
                  <span className="text-zinc-600 text-xs">
                    @{c.platformUsername}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Sort tabs */}
      {posts.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          <span className="text-xs text-zinc-600 mr-1">Saralash:</span>
          {SORT_OPTIONS.filter(
            (o) => !o.platforms || o.platforms.includes(activePlatform),
          ).map(({ value, label, icon: SIcon }) => (
            <button
              key={value}
              onClick={() => setSortMetric(value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all ${
                sortMetric === value
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'text-zinc-600 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <SIcon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!connections.length ? (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-1">Hali platforma ulanmagan</p>
          <p className="text-xs text-zinc-700">
            YouTube, Telegram, Instagram yoki Bluesky ulang
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">
            {PLATFORM_LABELS[activePlatform]} uchun post topilmadi
          </p>
          <p className="text-xs text-zinc-700 mt-1">Sync qilib ko&apos;ring</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((post) => (
            <PostCard key={post.id} post={post} icon={Icon} />
          ))}
        </div>
      )}
    </div>
  );
}
