'use client';

import { useState, useEffect, useCallback } from 'react';
import { use } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  Users,
  Eye,
  TrendingUp,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Share2,
  Copy,
  Check,
  X,
  RefreshCw,
  Download,
} from 'lucide-react';
import { exportApi, triggerDownload } from '@/lib/api/export';
import {
  websitesApi,
  type AnalyticsOverview,
  type PagesResponse,
  type SourcesResponse,
  type TrendPoint,
  type AudienceStats,
  type FunnelResult,
} from '@/lib/api/websites';
import { getToken } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

type Period = 'today' | 'week' | 'month';
type Tab = 'pages' | 'sources' | 'audience' | 'funnel' | 'events';
type PageSubTab = 'all' | 'entry' | 'exit';
type SourceSubTab = 'referrers' | 'campaigns';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Bugun',
  week: 'Bu hafta',
  month: 'Bu oy',
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
function fmtDuration(s: number) {
  if (!s) return '0s';
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function deviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('mobile') || n.includes('phone')) return Smartphone;
  if (n.includes('tablet')) return Tablet;
  return Monitor;
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

// ─── BreakdownList ─────────────────────────────────────────────────────────────

function BreakdownList({
  items,
  barColor = 'bg-accent-quiet',
  renderName,
}: {
  items: { name: string; count: number; percentage: number }[];
  barColor?: string;
  renderName?: (name: string) => React.ReactNode;
}) {
  if (!items.length)
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        Ma&apos;lumot yo&apos;q
      </p>
    );

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-ink-2 truncate max-w-[60%]">
              {renderName ? renderName(item.name) : item.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-ink-3 tabular-nums w-8 text-right">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums w-12 text-right">
                {fmt(item.count)}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} rounded-full transition-all`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function WebsiteAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [period, setPeriod] = useState<Period>('week');
  const [activeTab, setActiveTab] = useState<Tab>('pages');

  const [pageSubTab, setPageSubTab] = useState<PageSubTab>('all');
  const [sourceSubTab, setSourceSubTab] = useState<SourceSubTab>('referrers');
  const [site, setSite] = useState<{
    name: string;
    domain: string | null;
    shareId?: string | null;
  } | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pagesData, setPagesData] = useState<PagesResponse | null>(null);
  const [sources, setSources] = useState<SourcesResponse>({
    referrers: [],
    campaigns: [],
  });
  const [audience, setAudience] = useState<AudienceStats | null>(null);
  const [events, setEvents] = useState<
    { name: string; count: number; lastSeen: string | null }[]
  >([]);
  const [realtime, setRealtime] = useState<{ activeVisitors: number } | null>(
    null,
  );
  const [shareModal, setShareModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const exportPeriod = period === 'today' ? 'week' : (period as 'week' | 'month');
      const blob = await exportApi.exportWebsitePageviews(id, exportPeriod);
      triggerDownload(blob, `pageviews-${site?.name || id}-${exportPeriod}.csv`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Ma'lumotlarni eksport qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback(
    async (p: Period) => {
      setLoading(true);
      try {
        const [w, ov, tr, pg, src, aud, ev, rt] = await Promise.all([
          websitesApi.getOne(id),
          websitesApi.getAnalytics(id, p),
          websitesApi.getTrend(id, p),
          websitesApi.getPages(id, p),
          websitesApi.getSources(id, p),
          websitesApi.getSessions(id, p),
          websitesApi.getEvents(id, p),
          websitesApi.getRealtime(id),
        ]);
        setSite(w);
        setOverview(ov);
        setTrend(tr);
        setPagesData(pg);
        setSources(src);
        setAudience(aud);
        setEvents(ev.events);
        setRealtime(rt);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    load(period);
  }, [period, load]);

  // Realtime: SSE orqali har 5 soniyada yangilanadi. EventSource brauzer
  // API'si maxsus header qo'sha olmaydi, shuning uchun access token query
  // parametrida yuboriladi — u 15 daqiqada eskiradi, shu sabab ulanish
  // xatoga uchraganda (server 401/xato hodisasi yuborganda) yangi token
  // bilan qayta ulanamiz.
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    function connect() {
      if (stopped) return;
      const token = getToken();
      if (!token) {
        retryTimer = setTimeout(connect, 3000);
        return;
      }
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
      es = new EventSource(
        `${base}/websites/${id}/realtime/stream?token=${encodeURIComponent(token)}`,
      );

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.error) throw new Error(data.error);
          setRealtime(data);
        } catch {
          es?.close();
          retryTimer = setTimeout(connect, 5000);
        }
      };
      es.onerror = () => {
        es?.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => {
      stopped = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [id]);

  const trendData = trend.map((t) => ({ ...t, date: fmtDate(t.date) }));
  const pages = pagesData?.pages ?? [];
  const entryPages = pagesData?.entryPages ?? [];
  const exitPages = pagesData?.exitPages ?? [];
  const maxViews = pages[0]?.views ?? 1;
  const maxEntries = entryPages[0]?.entries ?? 1;
  const maxExits = exitPages[0]?.exits ?? 1;

  return (
    <div className="max-w-wide mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/websites"
            className="text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
              Sayt tahlili
            </p>
            <h1 className="text-lg font-semibold text-ink">
              {site?.name ?? 'Analytics'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {realtime && (
            <div className="flex items-center gap-1.5 text-xs text-positive-ink bg-positive-quiet border border-positive-line rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
              {realtime.activeVisitors} faol
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShareModal(true)}
            className="gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            Ulashish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={loading}
            onClick={() => load(period)}
            className="gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Yangilash
          </Button>
          <Button
            variant="secondary"
            size="sm"
            loading={exporting}
            onClick={handleExport}
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

      {shareModal && (
        <ShareModal
          websiteId={id}
          initialShareId={site?.shareId ?? null}
          onClose={() => setShareModal(false)}
          onChange={(shareId) => setSite((s) => (s ? { ...s, shareId } : s))}
        />
      )}

      {/* ── Overview cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            icon: <Users className="w-4 h-4 text-info-ink" />,
            label: 'Tashrifchilar',
            val: overview?.visitors,
            change: overview?.visitorChange,
            bg: 'bg-info-quiet border-info-line',
          },
          {
            icon: <Eye className="w-4 h-4 text-accent-ink" />,
            label: "Sahifa ko'rishlar",
            val: overview?.pageViews,
            change: overview?.pageViewChange,
            bg: 'bg-accent-quiet border-accent-line',
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-negative-ink" />,
            label: 'Bounce rate',
            val: overview ? `${overview.bounceRate.toFixed(1)}%` : undefined,
            bg: 'bg-negative-quiet border-negative-line',
          },
          {
            icon: <Clock className="w-4 h-4 text-positive-ink" />,
            label: "O'rtacha vaqt",
            val: overview ? fmtDuration(overview.avgDuration) : undefined,
            bg: 'bg-positive-quiet border-positive-line',
          },
        ].map(({ icon, label, val, change, bg }) => (
          <div key={label} className={`rounded-panel border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <span className="text-xs text-ink-3">{label}</span>
            </div>
            {loading || val === undefined ? (
              <div className="h-8 w-16 bg-surface-sunken rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold text-ink tabular-nums">
                  {typeof val === 'number' ? fmt(val) : val}
                </p>
                {change !== undefined && change !== null && (
                  <p
                    className={`text-xs mt-0.5 ${change >= 0 ? 'text-positive-ink' : 'text-negative-ink'}`}
                  >
                    {change >= 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Trend chart ── */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-ink mb-4">
            Tashrifchilar va ko&apos;rishlar dinamikasi
          </p>
          {loading ? (
            <div className="h-48 bg-surface-sunken rounded-control animate-pulse" />
          ) : trendData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-ink-3" />
              <p className="text-sm text-ink-3">
                Bu davrda ma&apos;lumot yo&apos;q
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--mx-info)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--mx-info)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={fmt}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 11,
                    color: 'var(--mx-ink-3)',
                    paddingTop: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Tashrifchilar"
                  stroke="var(--mx-info)"
                  strokeWidth={2}
                  fill="url(#gVisitors)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--mx-info)' }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Ko'rishlar"
                  stroke="var(--mx-accent)"
                  strokeWidth={2}
                  fill="url(#gViews)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--mx-accent)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <div>
        <div className="flex items-center gap-1 mb-3 border-b border-line">
          {[
            { key: 'pages' as Tab, label: 'Top sahifalar' },
            { key: 'sources' as Tab, label: 'Traffic manbalari' },
            { key: 'audience' as Tab, label: 'Auditoriya' },
            { key: 'funnel' as Tab, label: 'Funnel' },
            {
              key: 'events' as Tab,
              label: `Events${events.length ? ` (${events.length})` : ''}`,
            },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-accent-line text-accent-ink'
                  : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Top sahifalar */}
        {activeTab === 'pages' && (
          <Card>
            <CardContent className="p-0">
              {/* Subtabs */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-line-subtle">
                {[
                  { key: 'all' as PageSubTab, label: 'Barcha' },
                  { key: 'entry' as PageSubTab, label: 'Kirish sahifalari' },
                  { key: 'exit' as PageSubTab, label: 'Chiqish sahifalari' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPageSubTab(key)}
                    className={`px-3 py-2 text-xs transition-all border-b-2 -mb-px ${
                      pageSubTab === key
                        ? 'border-accent-line text-accent-ink'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* All pages */}
              {pageSubTab === 'all' && (
                <>
                  <div className="grid grid-cols-[1fr_70px_70px_80px] gap-3 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
                    <span>Sahifa</span>
                    <span className="text-right">Ko&apos;rish</span>
                    <span className="text-right">Unique</span>
                    <span className="text-right">Scroll</span>
                  </div>
                  {loading ? (
                    <SkeletonRows count={5} />
                  ) : pages.length === 0 ? (
                    <EmptyState />
                  ) : (
                    pages.map((page, i) => {
                      const scroll = page.avgScrollDepth;
                      const scrollColor =
                        scroll === null
                          ? ''
                          : scroll >= 61
                            ? 'text-positive-ink'
                            : scroll >= 31
                              ? 'text-accent-ink'
                              : 'text-negative-ink';
                      return (
                        <div
                          key={page.path}
                          className={`px-4 py-3 ${i < pages.length - 1 ? 'border-b border-line-subtle' : ''}`}
                        >
                          <div className="grid grid-cols-[1fr_70px_70px_80px] gap-3 items-center mb-1.5">
                            <p className="text-sm text-ink-2 font-mono truncate">
                              {page.path}
                            </p>
                            <p className="text-sm font-semibold text-ink tabular-nums text-right">
                              {fmt(page.views)}
                            </p>
                            <p className="text-sm text-ink-3 tabular-nums text-right">
                              {fmt(page.uniqueVisitors)}
                            </p>
                            <p
                              className={`text-sm font-medium tabular-nums text-right ${scrollColor || 'text-ink-3'}`}
                            >
                              {scroll !== null ? `↕ ${scroll}%` : '—'}
                            </p>
                          </div>
                          <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-quiet rounded-full"
                              style={{
                                width: `${(page.views / maxViews) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* Entry pages */}
              {pageSubTab === 'entry' && (
                <>
                  <div className="grid grid-cols-[1fr_100px] gap-4 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
                    <span>Kirish sahifasi</span>
                    <span className="text-right">Kirishlar</span>
                  </div>
                  {loading ? (
                    <SkeletonRows count={5} />
                  ) : entryPages.length === 0 ? (
                    <EmptyState />
                  ) : (
                    entryPages.map((page, i) => (
                      <div
                        key={page.path}
                        className={`px-4 py-3 ${i < entryPages.length - 1 ? 'border-b border-line-subtle' : ''}`}
                      >
                        <div className="grid grid-cols-[1fr_100px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-ink-2 font-mono truncate">
                            {page.path}
                          </p>
                          <p className="text-sm font-semibold text-ink tabular-nums text-right">
                            {fmt(page.entries)}
                          </p>
                        </div>
                        <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className="h-full bg-info-quiet rounded-full"
                            style={{
                              width: `${(page.entries / maxEntries) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Exit pages */}
              {pageSubTab === 'exit' && (
                <>
                  <div className="grid grid-cols-[1fr_80px_90px] gap-4 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
                    <span>Chiqish sahifasi</span>
                    <span className="text-right">Chiqishlar</span>
                    <span className="text-right">Exit rate</span>
                  </div>
                  {loading ? (
                    <SkeletonRows count={5} />
                  ) : exitPages.length === 0 ? (
                    <EmptyState />
                  ) : (
                    exitPages.map((page, i) => (
                      <div
                        key={page.path}
                        className={`px-4 py-3 ${i < exitPages.length - 1 ? 'border-b border-line-subtle' : ''}`}
                      >
                        <div className="grid grid-cols-[1fr_80px_90px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-ink-2 font-mono truncate">
                            {page.path}
                          </p>
                          <p className="text-sm font-semibold text-ink tabular-nums text-right">
                            {fmt(page.exits)}
                          </p>
                          <p
                            className={`text-sm font-semibold tabular-nums text-right ${page.exitRate > 50 ? 'text-negative-ink' : page.exitRate > 25 ? 'text-accent-ink' : 'text-positive-ink'}`}
                          >
                            {page.exitRate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className="h-full bg-negative-quiet rounded-full"
                            style={{
                              width: `${(page.exits / maxExits) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Traffic manbalari */}
        {activeTab === 'sources' && (
          <Card>
            <CardContent className="p-0">
              {/* Subtabs */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-line-subtle">
                {[
                  { key: 'referrers' as SourceSubTab, label: 'Manbalar' },
                  {
                    key: 'campaigns' as SourceSubTab,
                    label: `UTM Kampaniyalar${sources.campaigns.length ? ` (${sources.campaigns.length})` : ''}`,
                  },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSourceSubTab(key)}
                    className={`px-3 py-2 text-xs transition-all border-b-2 -mb-px ${
                      sourceSubTab === key
                        ? 'border-accent-line text-accent-ink'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Referrers */}
              {sourceSubTab === 'referrers' && (
                <>
                  <div className="grid grid-cols-[1fr_80px_64px] gap-4 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
                    <span>Manba</span>
                    <span className="text-right">Tashrifchilar</span>
                    <span className="text-right">%</span>
                  </div>
                  {loading ? (
                    <SkeletonRows count={4} />
                  ) : sources.referrers.length === 0 ? (
                    <EmptyState />
                  ) : (
                    sources.referrers.map((src, i) => (
                      <div
                        key={src.source}
                        className={`px-4 py-3 ${i < sources.referrers.length - 1 ? 'border-b border-line-subtle' : ''}`}
                      >
                        <div className="grid grid-cols-[1fr_80px_64px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-ink-2 truncate">
                            {src.source === 'direct'
                              ? "To'g'ridan-to'g'ri"
                              : src.source}
                          </p>
                          <p className="text-sm font-semibold text-ink tabular-nums text-right">
                            {fmt(src.visitors)}
                          </p>
                          <p className="text-sm text-ink-3 tabular-nums text-right">
                            {src.percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className="h-full bg-info-quiet rounded-full"
                            style={{ width: `${src.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* UTM Campaigns */}
              {sourceSubTab === 'campaigns' && (
                <>
                  <div className="grid grid-cols-[1fr_1fr_1fr_70px_56px] gap-3 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
                    <span>Manba</span>
                    <span>Medium</span>
                    <span>Kampaniya</span>
                    <span className="text-right">Tashrif</span>
                    <span className="text-right">%</span>
                  </div>
                  {loading ? (
                    <SkeletonRows count={4} />
                  ) : sources.campaigns.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-ink-3">
                        UTM parametrli tashrif yo&apos;q
                      </p>
                      <p className="text-xs text-ink-3 mt-1">
                        URL ga ?utm_source=... qo&apos;shing
                      </p>
                    </div>
                  ) : (
                    sources.campaigns.map((c, i) => (
                      <div
                        key={`${c.source}-${c.medium}-${c.campaign}`}
                        className={`px-4 py-3 ${i < sources.campaigns.length - 1 ? 'border-b border-line-subtle' : ''}`}
                      >
                        <div className="grid grid-cols-[1fr_1fr_1fr_70px_56px] gap-3 items-center mb-1.5">
                          <p className="text-sm text-ink-2 truncate font-medium">
                            {c.source || '—'}
                          </p>
                          <p className="text-xs text-ink-3 truncate">
                            {c.medium || '—'}
                          </p>
                          <p className="text-xs text-ink-3 truncate">
                            {c.campaign || '—'}
                          </p>
                          <p className="text-sm font-semibold text-ink tabular-nums text-right">
                            {fmt(c.visitors)}
                          </p>
                          <p className="text-sm text-ink-3 tabular-nums text-right">
                            {c.percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-1 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className="h-full bg-info-quiet rounded-full"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auditoriya */}
        {activeTab === 'audience' && (
          <div className="grid grid-cols-3 gap-4">
            {/* Qurilmalar */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-4">
                  Qurilmalar
                </p>
                {loading ? (
                  <SkeletonRows count={3} compact />
                ) : (
                  <BreakdownList
                    items={audience?.devices ?? []}
                    barColor="bg-accent-quiet"
                    renderName={(name) => {
                      const Icon = deviceIcon(name);
                      return (
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                          <span className="capitalize">{name}</span>
                        </span>
                      );
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Brauzerlar */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-4">
                  Brauzerlar
                </p>
                {loading ? (
                  <SkeletonRows count={4} compact />
                ) : (
                  <BreakdownList
                    items={audience?.browsers ?? []}
                    barColor="bg-info-quiet"
                  />
                )}
              </CardContent>
            </Card>

            {/* Davlatlar */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-4">
                  Davlatlar
                </p>
                {loading ? (
                  <SkeletonRows count={5} compact />
                ) : (
                  <BreakdownList
                    items={audience?.countries ?? []}
                    barColor="bg-positive-quiet"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Funnel */}
        {activeTab === 'funnel' && (
          <FunnelTab
            websiteId={id}
            period={period}
            availableEvents={events.map((e) => e.name)}
          />
        )}
        {/* Events */}
        {activeTab === 'events' && (
          <EventsTab
            websiteId={id}
            events={events}
            loading={loading}
            period={period}
          />
        )}
      </div>
    </div>
  );
}

// ─── FunnelTab ─────────────────────────────────────────────────────────────────

function FunnelTab({
  websiteId,
  period,
  availableEvents,
}: {
  websiteId: string;
  period: Period;
  availableEvents: string[];
}) {
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [result, setResult] = useState<FunnelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateStep(i: number, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  }

  function addStep() {
    if (steps.length >= 6) return;
    setSteps((prev) => [...prev, '']);
  }

  function removeStep(i: number) {
    if (steps.length <= 2) return;
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function compute() {
    const filled = steps.map((s) => s.trim()).filter(Boolean);
    if (filled.length < 2) {
      setError('Kamida 2 ta bosqich (event nomi) kiriting');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await websitesApi.getFunnel(websiteId, filled, period);
      setResult(res);
    } catch {
      setError('Funnel hisoblashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  const maxCount = result?.steps[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-ink mb-1">
            Konversiya bosqichlarini belgilang
          </p>
          <p className="text-xs text-ink-3 mb-3">
            Custom event nomlarini tartib bilan kiriting (masalan: Signup → Add
            to cart → Purchase)
          </p>

          {availableEvents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {availableEvents.map((name) => (
                <span
                  key={name}
                  className="text-[10px] bg-surface-sunken border border-line rounded px-1.5 py-0.5 text-ink-3 font-mono"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-ink-3 w-5 shrink-0 text-right">
                  {i + 1}.
                </span>
                <input
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder="Event nomi"
                  className="flex-1 px-3 py-2 text-sm rounded-control border border-line bg-surface text-ink placeholder:text-ink-faint outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong"
                />
                {steps.length > 2 && (
                  <button
                    onClick={() => removeStep(i)}
                    aria-label="Bosqichni o'chirish"
                    className="text-ink-3 hover:text-negative-ink transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            {steps.length < 6 && (
              <Button variant="secondary" size="sm" onClick={addStep}>
                + Bosqich qo&apos;shish
              </Button>
            )}
            <Button size="sm" onClick={compute} loading={loading}>
              Hisoblash
            </Button>
          </div>

          {error && <p className="text-xs text-negative-ink mt-2">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-ink">Natija</p>
              <span className="text-xs text-ink-3">
                Umumiy konversiya:{' '}
                <span className="text-accent-ink font-semibold">
                  {result.overallConversionPct}%
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {result.steps.map((s, i) => (
                <div key={s.step}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-2">
                      {i + 1}. {s.step}
                    </span>
                    <div className="flex items-center gap-2">
                      {i > 0 && s.dropOffPct > 0 && (
                        <span className="text-xs text-negative-ink">
                          -{s.dropOffPct}%
                        </span>
                      )}
                      <span className="text-sm font-semibold text-ink tabular-nums">
                        {fmt(s.count)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-quiet rounded-full transition-all"
                      style={{
                        width: `${maxCount ? (s.count / maxCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── ShareModal ─────────────────────────────────────────────────────────────────

function ShareModal({
  websiteId,
  initialShareId,
  onClose,
  onChange,
}: {
  websiteId: string;
  initialShareId: string | null;
  onClose: () => void;
  onChange: (shareId: string | null) => void;
}) {
  const [shareId, setShareId] = useState(initialShareId);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl =
    shareId && typeof window !== 'undefined'
      ? `${window.location.origin}/public/${shareId}`
      : '';

  async function enable() {
    setLoading(true);
    try {
      const res = await websitesApi.enableShare(websiteId);
      setShareId(res.shareId);
      onChange(res.shareId);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      await websitesApi.disableShare(websiteId);
      setShareId(null);
      onChange(null);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal size="md" title="Ommaviy dashboard havolasi" onClose={onClose}>
      {!shareId ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-3">
            Auth&apos;siz kirish mumkin bo&apos;lgan faqat-o&apos;qish uchun
            havola yarating — investorlar yoki jamoadoshlar bilan ulashish uchun
            qulay.
          </p>
          <Button onClick={enable} loading={loading}>
            Havola yaratish
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-canvas border border-line rounded-control px-3 py-2">
            <p className="text-xs text-ink-2 font-mono truncate flex-1">
              {publicUrl}
            </p>
            <button
              onClick={copy}
              aria-label="Nusxalash"
              className="text-ink-3 hover:text-ink transition-colors shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-positive-ink" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <Button variant="danger" onClick={disable} loading={loading}>
            Havolani o&apos;chirish
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ─── EventsTab ────────────────────────────────────────────────────────────────

interface EventDetailRow {
  id: string;
  path: string | null;
  country: string | null;
  device: string | null;
  properties: Record<string, unknown> | null;
  createdAt: string;
}

function EventsTab({
  websiteId,
  events,
  loading,
  period,
}: {
  websiteId: string;
  events: { name: string; count: number; lastSeen: string | null }[];
  loading: boolean;
  period: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, EventDetailRow[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  async function toggleEvent(name: string) {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    if (detail[name]) return;
    setDetailLoading(name);
    try {
      const rows = await websitesApi.getEventDetail(websiteId, name, period);
      setDetail((prev) => ({ ...prev, [name]: rows }));
    } finally {
      setDetailLoading(null);
    }
  }

  if (loading) return <SkeletonRows count={4} />;

  if (events.length === 0) {
    return (
      <div className="rounded-panel border border-line border-dashed p-12 text-center">
        <p className="text-sm text-ink-3 mb-1">
          Hali custom event qayd etilmagan
        </p>
        <p className="text-xs text-ink-3 mb-3">
          Saytingizda quyidagi kodni chaqiring:
        </p>
        <pre className="inline-block text-xs text-accent-ink bg-surface border border-line rounded-control px-4 py-2 font-mono">
          {`metrix('Purchase', { price: 49 })`}
        </pre>
      </div>
    );
  }

  const maxCount = events[0]?.count ?? 1;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_80px_120px] gap-4 px-4 py-2 border-b border-line-subtle text-xs text-ink-3 uppercase tracking-wider">
          <span>Event nomi</span>
          <span className="text-right">Soni</span>
          <span className="text-right">Oxirgi</span>
        </div>

        {events.map((ev, i) => {
          const isOpen = expanded === ev.name;
          const isLoading = detailLoading === ev.name;
          const rows = detail[ev.name] ?? [];

          return (
            <div
              key={ev.name}
              className={
                i < events.length - 1 ? 'border-b border-line-subtle' : ''
              }
            >
              {/* Event row */}
              <button
                onClick={() => toggleEvent(ev.name)}
                className="w-full grid grid-cols-[1fr_80px_120px] gap-4 items-center px-4 py-3 hover:bg-surface-hover transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOpen ? 'bg-accent' : 'bg-ink-faint'}`}
                  />
                  <span className="text-sm font-medium text-ink truncate">
                    {ev.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {fmt(ev.count)}
                  </span>
                  <div className="mt-1 h-1 bg-surface-sunken rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-quiet rounded-full"
                      style={{ width: `${(ev.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-ink-3 text-right">
                  {ev.lastSeen ? timeAgo(ev.lastSeen) : '—'}
                </p>
              </button>

              {/* Detail rows */}
              {isOpen && (
                <div className="bg-canvas border-t border-line-subtle px-4 py-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-6 bg-surface-sunken rounded animate-pulse"
                        />
                      ))}
                    </div>
                  ) : rows.length === 0 ? (
                    <p className="text-xs text-ink-3 py-2">
                      Ma&apos;lumot topilmadi
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-ink-3 mb-2">
                        So&apos;nggi {rows.length} ta hodisa:
                      </p>
                      {rows.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-start gap-3 py-1.5 border-b border-line-subtle last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {row.path && (
                                <span className="text-xs text-ink-3 font-mono">
                                  {row.path}
                                </span>
                              )}
                              {row.country && (
                                <span className="text-xs text-ink-3">
                                  {row.country}
                                </span>
                              )}
                            </div>
                            {row.properties &&
                              Object.keys(row.properties).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {Object.entries(row.properties).map(
                                    ([k, v]) => (
                                      <span
                                        key={k}
                                        className="text-[10px] bg-surface-sunken border border-line rounded px-1.5 py-0.5 text-ink-2 font-mono"
                                      >
                                        {k}:{' '}
                                        <span className="text-accent-ink">
                                          {String(v)}
                                        </span>
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                          </div>
                          <span className="text-[10px] text-ink-3 shrink-0 mt-0.5">
                            {timeAgo(row.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} kun oldin`;
  if (h > 0) return `${h} s oldin`;
  if (m > 0) return `${m} daq oldin`;
  return 'Hozir';
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SkeletonRows({
  count = 3,
  compact = false,
}: {
  count?: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-3' : 'p-4 space-y-3'}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-7 bg-surface-sunken rounded animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center text-sm text-ink-3">
      Bu davr uchun ma&apos;lumot yo&apos;q
    </div>
  );
}
