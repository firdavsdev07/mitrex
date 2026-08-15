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
import { StatTile } from '@/components/ui/stat-tile';
import { uzDateFull } from '@/lib/date';
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
    <div className="bg-surface border border-line rounded-control px-3 py-2 text-xs shadow-xl">
      <p className="text-ink-3 mb-1">{label}</p>
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
    <div className="max-w-wide mx-auto space-y-8">
      {/* ── Header ──
          Salomlashuv sahifadagi eng yirik element: u foydalanuvchini
          «hisobot» emas, «kunlik xulosa» kayfiyatiga qo'yadi. Ostidagi
          qator — sana va nima kuzatilayotgani, ya'ni kontekst. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ink">
            {greeting}
          </h1>
          <p className="mt-1 text-body text-ink-3">
            {uzDateFull(new Date())}
            {data
              ? ` · ${data.platforms.length + data.websites.length} ta manba`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 bg-surface border border-line rounded-control p-0.5">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-control transition-all duration-150 ${
                  period === p
                    ? 'bg-accent-quiet text-accent-ink border border-accent-line'
                    : 'text-ink-3 hover:text-ink'
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
        <div className="flex items-center justify-between gap-3 bg-negative-quiet border border-negative-line text-negative-ink text-sm px-4 py-3 rounded-panel">
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

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          tone="a"
          icon={<Eye />}
          label="Sayt tashriflari"
          hint={PERIOD_LABELS[period]}
          value={loading ? '—' : fmt(data?.summary.totalWebViews ?? 0)}
          loading={loading}
        />
        <StatTile
          tone="b"
          icon={<Link2 />}
          label="Ulangan platformalar"
          hint={
            data?.platforms.length
              ? `${data.platforms.length} ta kanal kuzatilmoqda`
              : 'Hali ulanmagan'
          }
          value={loading ? '—' : (data?.summary.totalPlatforms ?? 0)}
          loading={loading}
        />
        <StatTile
          tone="d"
          icon={<Globe />}
          label="Saytlar"
          hint={
            data?.websites.length
              ? `${data.websites.length} ta sayt kuzatilmoqda`
              : "Hali qo'shilmagan"
          }
          value={loading ? '—' : (data?.summary.totalWebsites ?? 0)}
          loading={loading}
        />
      </div>

      {/* ── Web views trend chart ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-ink">
                Sayt tashriflari
              </p>
              {trend.length > 0 && (
                <p className="text-xl font-bold text-ink tabular-nums mt-0.5">
                  {fmt(trend.reduce((s, t) => s + t.views, 0))}
                  <span className="text-xs font-normal text-ink-3 ml-1">
                    jami
                  </span>
                </p>
              )}
            </div>
            {/* Days selector */}
            <div className="flex items-center gap-0.5 bg-surface-sunken border border-line rounded-control p-0.5">
              {DAYS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendDays(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-control transition-all ${
                    trendDays === opt.value
                      ? 'bg-surface-hover text-ink'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-44 bg-surface-sunken rounded-control animate-pulse" />
          ) : trend.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-ink-3" />
              <p className="text-sm text-ink-3">Ma&apos;lumot yo&apos;q</p>
              <p className="text-xs text-ink-3">
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
                    <stop offset="5%" stopColor="var(--mx-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--mx-accent)" stopOpacity={0} />
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
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip content={<ChartTooltip unit="tashrif" />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="var(--mx-accent)"
                  strokeWidth={2}
                  fill="url(#viewsGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--mx-accent)' }}
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
            <h2 className="text-sm font-medium text-ink-2">Platformalar</h2>
            <Link
              href="/connections"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
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
                const color = PLATFORM_COLORS[p.platform] ?? 'var(--mx-accent)';
                const history = platformHistory[p.id] ?? [];
                const chartData = history.map((h) => ({
                  date: fmtDate(h.date),
                  followers: h.followers ?? 0,
                }));

                return (
                  <Link key={p.id} href={`/connections/${p.id}`} className="block">
                  <Card className="hover:border-line-strong transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-control bg-surface-sunken border border-line flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink">
                            {PLATFORM_LABELS[p.platform] ?? p.platform}
                          </p>
                          {p.username && (
                            <p className="text-xs text-ink-3 truncate">
                              @{p.username}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">
                            {fmt(p.followers)}
                            <span className="text-xs font-normal text-ink-3 ml-1">
                              obunachi
                            </span>
                          </p>
                          {p.growth !== null && (
                            <div
                              className={`flex items-center gap-0.5 justify-end text-xs ${p.growth >= 0 ? 'text-positive-ink' : 'text-negative-ink'}`}
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
                        <div className="flex items-center gap-3 mb-2 text-xs text-ink-3">
                          {p.likes != null && (
                            <span>
                              ❤{' '}
                              <span className="text-ink-2">
                                {fmt(p.likes)}
                              </span>
                            </span>
                          )}
                          {p.comments != null && (
                            <span>
                              💬{' '}
                              <span className="text-ink-2">
                                {fmt(p.comments)}
                              </span>
                            </span>
                          )}
                          {p.engagement != null && (
                            <span className="text-accent-ink font-medium">
                              {(p.engagement as number).toFixed(1)}% eng
                            </span>
                          )}
                          {p.lastSync && (
                            <span className="ml-auto text-ink-3">
                              {timeAgo(p.lastSync)}
                            </span>
                          )}
                        </div>
                      )}
                      {!(p.likes != null || p.comments != null || p.engagement != null) &&
                        p.lastSync && (
                          <p className="text-xs text-ink-3 mb-2 text-right">
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
                          <p className="text-xs text-ink-3">
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
            <h2 className="text-sm font-medium text-ink-2">Saytlar</h2>
            <Link
              href="/websites"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
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
                      <div className="w-8 h-8 rounded-control bg-surface-sunken border border-line flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-ink-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate group-hover:text-ink transition-colors">
                          {site.name}
                        </p>
                        {site.domain && (
                          <p className="text-xs text-ink-3 truncate">
                            {site.domain}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-ink tabular-nums">
                          {fmt(site.views)}
                        </p>
                        <p className="text-xs text-ink-3">tashrif</p>
                      </div>
                    </Link>

                    {/* Top pages */}
                    {site.topPages.length > 0 ? (
                      <div className="border-t border-line-subtle pt-3 space-y-1.5">
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
                              <p className="text-xs text-ink-3 font-mono truncate flex-1 min-w-0">
                                {page.path}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-16 h-1 bg-surface-sunken rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent-quiet rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-ink-2 tabular-nums w-6 text-right">
                                  {fmt(page.views)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-3 pt-2 border-t border-line-subtle">
                        Bu davrda ma&apos;lumot yo&apos;q
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Link href="/websites">
                <div className="rounded-panel border border-line border-dashed p-3 flex items-center justify-center gap-2 text-xs text-ink-3 hover:text-ink hover:border-line-strong transition-all cursor-pointer">
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

function PlatformsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-28 rounded-panel border border-line bg-surface animate-pulse"
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
          className="h-16 rounded-panel border border-line bg-surface animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyPlatforms() {
  return (
    <div className="rounded-panel border border-line border-dashed bg-surface p-6 text-center">
      <Link2 className="w-8 h-8 text-ink-3 mx-auto mb-3" />
      <p className="text-sm text-ink-3 mb-1">Hali platforma ulanmagan</p>
      <p className="text-xs text-ink-3 mb-4">
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
    <div className="rounded-panel border border-line border-dashed bg-surface p-6 text-center">
      <Globe className="w-8 h-8 text-ink-3 mx-auto mb-3" />
      <p className="text-sm text-ink-3 mb-1">Hali sayt qo&apos;shilmagan</p>
      <p className="text-xs text-ink-3 mb-4">
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
