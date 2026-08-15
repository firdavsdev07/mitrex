'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Globe,
  Link2,
  Plus,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import {
  dashboardApi,
  type DashboardOverview,
  type Period,
  type TrendPoint,
  type PlatformHistoryPoint,
} from '@/lib/api/dashboard';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  RedditIcon,
} from '@/components/icons/platform-icons';

// ─── constants ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Bugun',
  week: 'Bu hafta',
  month: 'Bu oy',
};

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  DISCORD: DiscordIcon,
  BLUESKY: BlueskyIcon,
  REDDIT: RedditIcon,
};

const PLATFORM_COLORS: Record<string, string> = {
  YOUTUBE: '#ff4444',
  TELEGRAM: '#2AABEE',
  INSTAGRAM: '#E1306C',
  DISCORD: '#5865F2',
  BLUESKY: '#0085ff',
  REDDIT: '#FF4500',
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  DISCORD: 'Discord',
  BLUESKY: 'Bluesky',
  REDDIT: 'Reddit',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null) {
  if (n === null) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// "5 daqiqa oldin" — foydalanuvchi "Yangilash" bosgandan keyin ma'lumot
// haqiqatan yangilanganini darhol ko'rishi uchun.
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'hozirgina yangilandi';
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  return `${day} kun oldin`;
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-500 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {fmt(p.value ?? 0)} {unit}
        </p>
      ))}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [
  { label: '7 kun', value: 7 },
  { label: '14 kun', value: 14 },
  { label: '30 kun', value: 30 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [period, setPeriod] = useState<Period>('week');
  const [trendDays, setTrendDays] = useState(14);
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [platformHistory, setPlatformHistory] = useState<
    Record<string, PlatformHistoryPoint[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (p: Period, days: number, wsId?: string) => {
    setLoading(true);
    setError(false);
    try {
      const [overview, webTrend] = await Promise.all([
        dashboardApi.overview(p, wsId),
        dashboardApi.webTrend(days, wsId),
      ]);
      setData(overview);
      setTrend(webTrend);

      // Ulanish tarixi — connectionId bo'yicha (bitta platformada bir nechta
      // ulanish bo'lishi mumkin, platform stringi endi noyob emas).
      const connectionIds = overview.platforms.map((pl) => pl.id);
      if (connectionIds.length) {
        const histories = await Promise.all(
          connectionIds.map((id) => dashboardApi.connectionHistory(id, 14)),
        );
        const map: Record<string, PlatformHistoryPoint[]> = {};
        histories.forEach((h, i) => {
          if (h) map[connectionIds[i]] = h.history;
        });
        setPlatformHistory(map);
      }
    } catch {
      // Avvalgi so'rov (bootstrapSession/refresh) hali tugamagan bo'lishi
      // mumkin, yoki tarmoq xatosi — foydalanuvchiga sababsiz bo'sh sahifa
      // ko'rsatish o'rniga qayta urinish imkonini beramiz.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    load(period, trendDays, activeWorkspace?.id);
  }, [period, trendDays, activeWorkspace?.id, load]);

  async function handleSync() {
    setSyncing(true);
    try {
      await dashboardApi.syncNow();
      await load(period, trendDays);
    } finally {
      setSyncing(false);
    }
  }

  const greeting = user?.name
    ? `Xush kelibsiz, ${user.name.split(' ')[0]}`
    : 'Xush kelibsiz';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
            Umumiy ko&apos;rinish
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">{greeting}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all duration-150 ${
                  period === p
                    ? 'bg-orange-500/12 text-orange-400 border border-orange-500/20'
                    : 'text-zinc-600 hover:text-zinc-300'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={syncing}
            onClick={handleSync}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yangilash
          </Button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && !loading && (
        <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          <span>Statistikani yuklab bo&apos;lmadi. Internetni tekshiring.</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(period, trendDays)}
          >
            Qayta urinish
          </Button>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<Link2 className="w-4 h-4 text-orange-400" />}
          label="Ulangan platformalar"
          value={loading ? null : (data?.summary.totalPlatforms ?? 0)}
          bg="bg-orange-500/8 border-orange-500/15"
        />
        <SummaryCard
          icon={<Globe className="w-4 h-4 text-blue-400" />}
          label="Saytlar"
          value={loading ? null : (data?.summary.totalWebsites ?? 0)}
          bg="bg-blue-500/8 border-blue-500/15"
        />
        <SummaryCard
          icon={<Eye className="w-4 h-4 text-green-400" />}
          label="Sayt tashriflari"
          value={loading ? null : (data?.summary.totalWebViews ?? 0)}
          bg="bg-green-500/8 border-green-500/15"
        />
      </div>

      {/* ── Web views trend chart ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                Sayt tashriflari
              </p>
              {trend.length > 0 && (
                <p className="text-xl font-bold text-zinc-100 tabular-nums mt-0.5">
                  {fmt(trend.reduce((s, t) => s + t.views, 0))}
                  <span className="text-xs font-normal text-zinc-600 ml-1">
                    jami
                  </span>
                </p>
              )}
            </div>
            {/* Days selector */}
            <div className="flex items-center gap-0.5 bg-zinc-800/60 border border-zinc-800 rounded-lg p-0.5">
              {DAYS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendDays(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all ${
                    trendDays === opt.value
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-44 bg-zinc-800/30 rounded-lg animate-pulse" />
          ) : trend.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">Ma&apos;lumot yo&apos;q</p>
              <p className="text-xs text-zinc-700">
                Sayt qo&apos;shing va tracking skriptini joylashtiring
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart
                data={trend.map((t) => ({ ...t, date: fmtDate(t.date) }))}
              >
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#52525b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<ChartTooltip unit="tashrif" />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#viewsGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f97316' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Platforms + Websites ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Platforms */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-300">Platformalar</h2>
            <Link
              href="/connections"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Barchasi →
            </Link>
          </div>

          {loading ? (
            <PlatformsSkeleton />
          ) : !data?.platforms.length ? (
            <EmptyPlatforms />
          ) : (
            <div className="flex flex-col gap-3">
              {data.platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p.platform] ?? Globe;
                const color = PLATFORM_COLORS[p.platform] ?? '#f97316';
                const history = platformHistory[p.id] ?? [];
                const chartData = history.map((h) => ({
                  date: fmtDate(h.date),
                  followers: h.followers ?? 0,
                }));

                return (
                  <Link key={p.id} href={`/connections/${p.id}`} className="block">
                  <Card className="hover:border-zinc-700 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200">
                            {PLATFORM_LABELS[p.platform] ?? p.platform}
                          </p>
                          {p.username && (
                            <p className="text-xs text-zinc-600 truncate">
                              @{p.username}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-zinc-100 tabular-nums">
                            {fmt(p.followers)}
                            <span className="text-xs font-normal text-zinc-600 ml-1">
                              obunachi
                            </span>
                          </p>
                          {p.growth !== null && (
                            <div
                              className={`flex items-center gap-0.5 justify-end text-xs ${p.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}
                            >
                              {p.growth >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {Math.abs(p.growth)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Engagement stats */}
                      {(p.likes != null ||
                        p.comments != null ||
                        p.engagement != null) && (
                        <div className="flex items-center gap-3 mb-2 text-xs text-zinc-500">
                          {p.likes != null && (
                            <span>
                              ❤{' '}
                              <span className="text-zinc-300">
                                {fmt(p.likes)}
                              </span>
                            </span>
                          )}
                          {p.comments != null && (
                            <span>
                              💬{' '}
                              <span className="text-zinc-300">
                                {fmt(p.comments)}
                              </span>
                            </span>
                          )}
                          {p.engagement != null && (
                            <span className="text-orange-400 font-medium">
                              {(p.engagement as number).toFixed(1)}% eng
                            </span>
                          )}
                          {p.lastSync && (
                            <span className="ml-auto text-zinc-600">
                              {timeAgo(p.lastSync)}
                            </span>
                          )}
                        </div>
                      )}
                      {!(p.likes != null || p.comments != null || p.engagement != null) &&
                        p.lastSync && (
                          <p className="text-xs text-zinc-600 mb-2 text-right">
                            {timeAgo(p.lastSync)}
                          </p>
                        )}

                      {/* Sparkline */}
                      {chartData.length > 1 ? (
                        <ResponsiveContainer width="100%" height={40}>
                          <LineChart data={chartData}>
                            <Line
                              type="monotone"
                              dataKey="followers"
                              stroke={color}
                              strokeWidth={1.5}
                              dot={false}
                            />
                            <Tooltip
                              content={<ChartTooltip unit="obunachi" />}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-10 flex items-center justify-center">
                          <p className="text-xs text-zinc-700">
                            Trend ma&apos;lumoti yo&apos;q
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Websites */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-300">Saytlar</h2>
            <Link
              href="/websites"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Barchasi →
            </Link>
          </div>

          {loading ? (
            <WebsitesSkeleton />
          ) : !data?.websites.length ? (
            <EmptyWebsites />
          ) : (
            <div className="flex flex-col gap-3">
              {data.websites.map((site) => (
                <Card key={site.id}>
                  <CardContent className="p-4">
                    {/* Site header */}
                    <Link
                      href={`/websites/${site.id}`}
                      className="flex items-center gap-3 mb-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                          {site.name}
                        </p>
                        {site.domain && (
                          <p className="text-xs text-zinc-600 truncate">
                            {site.domain}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-zinc-100 tabular-nums">
                          {fmt(site.views)}
                        </p>
                        <p className="text-xs text-zinc-600">tashrif</p>
                      </div>
                    </Link>

                    {/* Top pages */}
                    {site.topPages.length > 0 ? (
                      <div className="border-t border-zinc-800/50 pt-3 space-y-1.5">
                        {site.topPages.map((page) => {
                          const pct =
                            site.views > 0
                              ? Math.round((page.views / site.views) * 100)
                              : 0;
                          return (
                            <div
                              key={page.path}
                              className="flex items-center gap-2"
                            >
                              <p className="text-xs text-zinc-500 font-mono truncate flex-1 min-w-0">
                                {page.path}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange-500/60 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-zinc-400 tabular-nums w-6 text-right">
                                  {fmt(page.views)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-700 pt-2 border-t border-zinc-800/50">
                        Bu davrda ma&apos;lumot yo&apos;q
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Link href="/websites">
                <div className="rounded-xl border border-zinc-800 border-dashed p-3 flex items-center justify-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  Yangi sayt qo&apos;shish
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      {value === null ? (
        <div className="h-8 w-16 bg-zinc-800/50 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-zinc-100 tabular-nums">
          {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
        </p>
      )}
    </div>
  );
}

function PlatformsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
        />
      ))}
    </div>
  );
}

function WebsitesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyPlatforms() {
  return (
    <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-6 text-center">
      <Link2 className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
      <p className="text-sm text-zinc-500 mb-1">Hali platforma ulanmagan</p>
      <p className="text-xs text-zinc-700 mb-4">
        YouTube, Telegram va boshqalarni ulang
      </p>
      <Link href="/connections">
        <Button size="sm" variant="secondary">
          <Plus className="w-3.5 h-3.5" />
          Platforma ulash
        </Button>
      </Link>
    </div>
  );
}

function EmptyWebsites() {
  return (
    <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-6 text-center">
      <Globe className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
      <p className="text-sm text-zinc-500 mb-1">Hali sayt qo&apos;shilmagan</p>
      <p className="text-xs text-zinc-700 mb-4">
        Saytingizni qo&apos;shing va statistika kuzating
      </p>
      <Link href="/websites">
        <Button size="sm" variant="secondary">
          <Plus className="w-3.5 h-3.5" />
          Sayt qo&apos;shish
        </Button>
      </Link>
    </div>
  );
}
