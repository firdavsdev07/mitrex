'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  Info,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportApi, triggerDownload } from '@/lib/api/export';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  RedditIcon,
  FacebookIcon,
  ThreadsIcon,
} from '@/components/icons/platform-icons';
import { dashboardApi, type PlatformHistoryPoint } from '@/lib/api/dashboard';
import { postsApi, type Post, type SortMetric } from '@/lib/api/posts';
import { connectionsApi } from '@/lib/api/connections';
import { PostCard } from '@/components/posts/post-card';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Bugun',
  week: 'Bu hafta',
  month: 'Bu oy',
};
const PERIOD_DAYS: Record<Period, number> = {
  today: 1,
  week: 7,
  month: 30,
};

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  DISCORD: DiscordIcon,
  BLUESKY: BlueskyIcon,
  REDDIT: RedditIcon,
  FACEBOOK: FacebookIcon,
  THREADS: ThreadsIcon,
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  DISCORD: 'Discord',
  BLUESKY: 'Bluesky',
  REDDIT: 'Reddit',
  FACEBOOK: 'Facebook',
  THREADS: 'Threads',
};

// Discord va Reddit'da "post" tushunchasi yo'q (server/subreddit-darajasidagi
// statistika) — shu platformalar uchun top-postlar bo'limi ko'rsatilmaydi.
const SUPPORTS_POSTS = new Set(['YOUTUBE', 'TELEGRAM', 'INSTAGRAM', 'BLUESKY']);

const DEFAULT_SORT: Record<string, SortMetric> = {
  YOUTUBE: 'views',
  TELEGRAM: 'views',
  INSTAGRAM: 'views',
  BLUESKY: 'likes',
};

const CONTENT_TYPE_FILTER_LABELS: Record<string, string> = {
  FEED: 'Postlar',
  REELS: 'Reels',
  STORY: 'Storylar',
};

const CAVEATS: Record<string, string> = {
  TELEGRAM:
    "Post-ko'rishlar faqat kanal turidagi ulanishlarda ishlaydi (guruhlarda Telegram bu ma'lumotni umuman kuzatmaydi). Yangi ulangan kanallarda birinchi sinxronizatsiyadan so'ng paydo bo'ladi.",
  BLUESKY:
    "Bluesky ochiq API'sida ko'rishlar soni mavjud emas — postlar like va repost soni bo'yicha saralangan.",
  INSTAGRAM:
    "\"+N obunachi\" ko'rsatkichi (shu kontent orqali kelgan yangi obunachilar) oddiy postlar va storylarda ishlaydi — Reels uchun Metaning o'zi bu ma'lumotni umuman bermaydi (platforma cheklovi, kelajakda ham qo'shilmasligi mumkin). Storylar 24 soatdan keyin o'chib ketadi, shuning uchun faqat oxirgi sinxronizatsiya vaqtida faol bo'lganlari ko'rinadi. Instagram statistikasi Meta App Review tasdig'ini kutmoqda — production muhitida to'liq ishlashi uchun tasdiq talab qilinadi.",
  YOUTUBE:
    "\"+N obunachi\" ko'rsatkichi faqat kanalni Google orqali (OAuth) ulaganingizda ko'rinadi — handle orqali ulangan kanallarda (o'zingizniki bo'lmasa ham) faqat ko'rishlar/like/izohlar mavjud.",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-line rounded-control px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-3 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
// Route connectionId bo'yicha — platform emas, chunki bitta platformada bir
// nechta ulanish bo'lishi mumkin (masalan 2 ta Telegram kanal). Platforma
// turi (ikonka, "post" tushunchasi bor-yo'qligi) ulanishlar ro'yxatidan
// aniqlanadi.

export default function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = use(params);

  const [period, setPeriod] = useState<Period>('month');
  const [platform, setPlatform] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<PlatformHistoryPoint[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [contentFilter, setContentFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [exportingStats, setExportingStats] = useState(false);
  const [exportingPosts, setExportingPosts] = useState(false);

  async function handleExportStats() {
    setExportingStats(true);
    try {
      const blob = await exportApi.exportPlatformStats(connectionId);
      triggerDownload(blob, `connection-${platform || 'stats'}-${connectionId}.csv`);
    } catch (err) {
      console.error('Export stats error:', err);
      toast.error("Statistikani eksport qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setExportingStats(false);
    }
  }

  async function handleExportPosts() {
    setExportingPosts(true);
    try {
      const blob = await exportApi.exportPosts(connectionId);
      triggerDownload(blob, `posts-${platform || 'stats'}-${connectionId}.csv`);
    } catch (err) {
      console.error('Export posts error:', err);
      toast.error("Postlarni eksport qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setExportingPosts(false);
    }
  }

  const supportsPosts = platform ? SUPPORTS_POSTS.has(platform) : false;
  const Icon = platform ? PLATFORM_ICONS[platform] : undefined;

  // Ulanish qaysi platformaga tegishli ekanini aniqlash uchun ro'yxatdan
  // izlaymiz — connectionId o'z-o'zidan platforma turini bermaydi.
  useEffect(() => {
    connectionsApi
      .list()
      .then((conns) => {
        const conn = conns.find((c) => c.id === connectionId);
        if (!conn) {
          setNotFound(true);
          return;
        }
        setPlatform(conn.platform);
        setUsername(conn.platformUsername);
      })
      .catch(() => setNotFound(true));
  }, [connectionId]);

  const loadHistory = useCallback(
    async (p: Period) => {
      setLoading(true);
      try {
        const res = await dashboardApi.connectionHistory(
          connectionId,
          PERIOD_DAYS[p],
        );
        setHistory(res?.history ?? []);
        if (res?.username) setUsername(res.username);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    },
    [connectionId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    loadHistory(period);
  }, [period, loadHistory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    setContentFilter('ALL');
    if (!platform || !supportsPosts) {
      setPostsLoading(false);
      return;
    }
    setPostsLoading(true);
    postsApi
      .list(connectionId, 50)
      .then((res) => {
        const metric = DEFAULT_SORT[platform] ?? 'views';
        const sorted = [...res.posts].sort(
          (a, b) => (b[metric] ?? -1) - (a[metric] ?? -1),
        );
        setPosts(sorted);
        setPostsTotal(res.total);
      })
      .catch(() => {
        setPosts([]);
        setPostsTotal(0);
      })
      .finally(() => setPostsLoading(false));
  }, [connectionId, platform, supportsPosts]);

  const contentTypes = Array.from(
    new Set(posts.map((p) => p.contentType).filter(Boolean)),
  ) as string[];
  const filteredPosts =
    contentFilter === 'ALL'
      ? posts
      : posts.filter((p) => p.contentType === contentFilter);

  const chartData = history.map((h) => ({ ...h, date: fmtDate(h.date) }));
  const latest = history[history.length - 1];
  const first = history[0];
  const growthCount =
    first?.followers != null && latest?.followers != null
      ? latest.followers - first.followers
      : null;
  const growth =
    first?.followers && latest?.followers
      ? ((latest.followers - first.followers) / first.followers) * 100
      : null;

  if (notFound) {
    return (
      <div className="max-w-wide mx-auto">
        <div className="rounded-panel border border-line border-dashed bg-surface p-12 text-center">
          <p className="text-sm text-ink-2 mb-1">Ulanish topilmadi</p>
          <Link href="/connections" className="text-xs text-accent-ink hover:underline">
            Ulashlar sahifasiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-wide mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/connections"
            className="text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-control bg-surface-sunken border border-line flex items-center justify-center shrink-0">
            {Icon && <Icon className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
              {(platform && PLATFORM_LABELS[platform]) ?? platform ?? ''}
            </p>
            <h1 className="text-lg font-semibold text-ink">
              {username ? `@${username}` : 'Statistika'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={exportingStats}
            onClick={handleExportStats}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport (CSV)
          </Button>
          <div className="flex items-center gap-0.5 bg-surface border border-line rounded-control p-0.5">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-control transition-all ${
                  period === p
                    ? 'bg-accent-quiet text-accent-ink border border-accent-line'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-panel border p-4 bg-info-quiet border-info-line">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-info-ink" />
            <span className="text-xs text-ink-3">
              A&apos;zolar / obunachilar
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-surface-sunken rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-ink tabular-nums">
              {latest?.followers != null ? fmt(latest.followers) : '—'}
            </p>
          )}
        </div>

        <div className="rounded-panel border p-4 bg-accent-quiet border-accent-line">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-accent-ink" />
            <span className="text-xs text-ink-3">Ko&apos;rishlar</span>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-surface-sunken rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-ink tabular-nums">
              {latest?.views != null ? fmt(latest.views) : '—'}
            </p>
          )}
        </div>

        <div
          className={`rounded-panel border p-4 ${
            growth === null
              ? 'bg-surface-sunken border-line'
              : growth >= 0
                ? 'bg-positive-quiet border-positive-line'
                : 'bg-negative-quiet border-negative-line'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {growth === null || growth >= 0 ? (
              <TrendingUp className="w-4 h-4 text-positive-ink" />
            ) : (
              <TrendingDown className="w-4 h-4 text-negative-ink" />
            )}
            <span className="text-xs text-ink-3">
              {PERIOD_LABELS[period]}dagi o&apos;sish
            </span>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-surface-sunken rounded animate-pulse" />
          ) : (
            <>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  growthCount === null
                    ? 'text-ink-3'
                    : growthCount >= 0
                      ? 'text-positive-ink'
                      : 'text-negative-ink'
                }`}
              >
                {growthCount === null
                  ? '—'
                  : `${growthCount >= 0 ? '+' : '-'}${fmt(Math.abs(growthCount))}`}
              </p>
              {growth !== null && (
                <p
                  className={`text-xs mt-0.5 ${growth >= 0 ? 'text-positive-ink' : 'text-negative-ink'}`}
                >
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(1)}%
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Growth chart */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-ink mb-4">
            A&apos;zolar soni dinamikasi
          </p>
          {loading ? (
            <div className="h-48 bg-surface-sunken rounded-control animate-pulse" />
          ) : chartData.length < 2 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-8 h-8 text-ink-3" />
              <p className="text-sm text-ink-3">
                Bu davrda yetarli ma&apos;lumot yo&apos;q
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--mx-info)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--mx-info)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mx-chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--mx-chart-axis)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--mx-chart-axis)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={fmt}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="followers"
                  name="Obunachilar"
                  stroke="var(--mx-info)"
                  strokeWidth={2}
                  fill="url(#gFollowers)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--mx-info)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Posts / Reels / Stories */}
      {platform && supportsPosts && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-ink">
              Barcha kontent{postsTotal > 0 ? ` (${postsTotal})` : ''}
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={exportingPosts}
              onClick={handleExportPosts}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Postlarni eksport qilish (CSV)
            </Button>
          </div>

          {CAVEATS[platform] && (
            <div className="mb-3 flex items-start gap-2 text-xs text-ink-3 bg-surface border border-line rounded-control px-3 py-2.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{CAVEATS[platform]}</span>
            </div>
          )}

          {contentTypes.length > 1 && (
            <div className="flex items-center gap-1 mb-3 bg-surface border border-line rounded-control p-0.5 w-fit">
              {['ALL', ...contentTypes].map((ct) => (
                <button
                  key={ct}
                  onClick={() => setContentFilter(ct)}
                  className={`text-xs px-3 py-1.5 rounded-control transition-all ${
                    contentFilter === ct
                      ? 'bg-accent-quiet text-accent-ink border border-accent-line'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {ct === 'ALL'
                    ? 'Hammasi'
                    : (CONTENT_TYPE_FILTER_LABELS[ct] ?? ct)}
                </button>
              ))}
            </div>
          )}

          {postsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-panel border border-line bg-surface animate-pulse"
                />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-panel border border-line border-dashed bg-surface p-8 text-center">
              <p className="text-sm text-ink-3">Hali post topilmadi</p>
              <p className="text-xs text-ink-3 mt-1">
                <Link
                  href="/connections"
                  className="text-accent-ink hover:underline"
                >
                  Sinxronlashtirib
                </Link>{' '}
                ko&apos;ring
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} icon={Icon} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
