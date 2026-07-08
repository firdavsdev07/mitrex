"use client";

import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, Users, Eye, TrendingUp, Clock,
  Globe, Monitor, Smartphone, Tablet,
} from "lucide-react";
import {
  websitesApi,
  type AnalyticsOverview,
  type PagesResponse,
  type SourcesResponse,
  type TrendPoint,
  type AudienceStats,
} from "@/lib/api/websites";
import { Card, CardContent } from "@/components/ui/card";

type Period = "today" | "week" | "month";
type Tab = "pages" | "sources" | "audience" | "events";
type PageSubTab = "all" | "entry" | "exit";
type SourceSubTab = "referrers" | "campaigns";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Bugun", week: "Bu hafta", month: "Bu oy",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtDuration(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function deviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("mobile") || n.includes("phone")) return Smartphone;
  if (n.includes("tablet")) return Tablet;
  return Monitor;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-500 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── BreakdownList ─────────────────────────────────────────────────────────────

function BreakdownList({
  items,
  barColor = "bg-orange-500/60",
  renderName,
}: {
  items: { name: string; count: number; percentage: number }[];
  barColor?: string;
  renderName?: (name: string) => React.ReactNode;
}) {
  if (!items.length)
    return <p className="py-6 text-center text-sm text-zinc-600">Ma&apos;lumot yo&apos;q</p>;

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-zinc-300 truncate max-w-[60%]">
              {renderName ? renderName(item.name) : item.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="text-sm font-semibold text-zinc-100 tabular-nums w-12 text-right">
                {fmt(item.count)}
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
  const [period, setPeriod] = useState<Period>("week");
  const [activeTab, setActiveTab] = useState<Tab>("pages");

  const [pageSubTab, setPageSubTab] = useState<PageSubTab>("all");
  const [sourceSubTab, setSourceSubTab] = useState<SourceSubTab>("referrers");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pagesData, setPagesData] = useState<PagesResponse | null>(null);
  const [sources, setSources] = useState<SourcesResponse>({ referrers: [], campaigns: [] });
  const [audience, setAudience] = useState<AudienceStats | null>(null);
  const [events, setEvents] = useState<{ name: string; count: number; lastSeen: string | null }[]>([]);
  const [realtime, setRealtime] = useState<{ activeVisitors: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const [ov, tr, pg, src, aud, ev, rt] = await Promise.all([
        websitesApi.getAnalytics(id, p),
        websitesApi.getTrend(id, p),
        websitesApi.getPages(id, p),
        websitesApi.getSources(id, p),
        websitesApi.getSessions(id, p),
        websitesApi.getEvents(id, p),
        websitesApi.getRealtime(id),
      ]);
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
  }, [id]);

  useEffect(() => {
    load(period);
    const iv = setInterval(() => {
      websitesApi.getRealtime(id).then(setRealtime).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, [period, load, id]);

  const trendData = trend.map((t) => ({ ...t, date: fmtDate(t.date) }));
  const pages = pagesData?.pages ?? [];
  const entryPages = pagesData?.entryPages ?? [];
  const exitPages = pagesData?.exitPages ?? [];
  const maxViews = pages[0]?.views ?? 1;
  const maxEntries = entryPages[0]?.entries ?? 1;
  const maxExits = exitPages[0]?.exits ?? 1;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/websites" className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Sayt tahlili</p>
            <h1 className="text-lg font-semibold text-zinc-100">Analytics</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {realtime && (
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {realtime.activeVisitors} faol
            </div>
          )}
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                  period === p
                    ? "bg-orange-500/12 text-orange-400 border border-orange-500/20"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Overview cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <Users className="w-4 h-4 text-blue-400" />,   label: "Tashrifchilar",     val: overview?.visitors,   change: overview?.visitorChange,  bg: "bg-blue-500/8 border-blue-500/15"   },
          { icon: <Eye className="w-4 h-4 text-orange-400" />,   label: "Sahifa ko'rishlar", val: overview?.pageViews,  change: overview?.pageViewChange, bg: "bg-orange-500/8 border-orange-500/15" },
          { icon: <TrendingUp className="w-4 h-4 text-red-400" />, label: "Bounce rate",     val: overview ? `${overview.bounceRate.toFixed(1)}%` : undefined, bg: "bg-red-500/8 border-red-500/15" },
          { icon: <Clock className="w-4 h-4 text-green-400" />,  label: "O'rtacha vaqt",    val: overview ? fmtDuration(overview.avgDuration) : undefined,    bg: "bg-green-500/8 border-green-500/15" },
        ].map(({ icon, label, val, change, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              {icon}
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
            {loading || val === undefined ? (
              <div className="h-8 w-16 bg-zinc-800/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                  {typeof val === "number" ? fmt(val) : val}
                </p>
                {change !== undefined && change !== null && (
                  <p className={`text-xs mt-0.5 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {change >= 0 ? "+" : ""}{change.toFixed(1)}%
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
          <p className="text-sm font-medium text-zinc-200 mb-4">
            Tashrifchilar va ko&apos;rishlar dinamikasi
          </p>
          {loading ? (
            <div className="h-48 bg-zinc-800/30 rounded-lg animate-pulse" />
          ) : trendData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <Globe className="w-8 h-8 text-zinc-700" />
              <p className="text-sm text-zinc-600">Bu davrda ma&apos;lumot yo&apos;q</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#52525b", fontSize: 11 }} axisLine={false} tickLine={false} width={36} tickFormatter={fmt} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 8 }} />
                <Area type="monotone" dataKey="visitors" name="Tashrifchilar" stroke="#3b82f6" strokeWidth={2} fill="url(#gVisitors)" dot={false} activeDot={{ r: 4, fill: "#3b82f6" }} />
                <Area type="monotone" dataKey="views"    name="Ko'rishlar"    stroke="#f97316" strokeWidth={2} fill="url(#gViews)"    dot={false} activeDot={{ r: 4, fill: "#f97316" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <div>
        <div className="flex items-center gap-1 mb-3 border-b border-zinc-800">
          {([
            { key: "pages"    as Tab, label: "Top sahifalar"    },
            { key: "sources"  as Tab, label: "Traffic manbalari" },
            { key: "audience" as Tab, label: "Auditoriya"        },
            { key: "events"   as Tab, label: `Events${events.length ? ` (${events.length})` : ""}` },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
                activeTab === key
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Top sahifalar */}
        {activeTab === "pages" && (
          <Card>
            <CardContent className="p-0">
              {/* Subtabs */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-800/60">
                {([
                  { key: "all"   as PageSubTab, label: "Barcha" },
                  { key: "entry" as PageSubTab, label: "Kirish sahifalari" },
                  { key: "exit"  as PageSubTab, label: "Chiqish sahifalari" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPageSubTab(key)}
                    className={`px-3 py-2 text-xs transition-all border-b-2 -mb-px ${
                      pageSubTab === key
                        ? "border-orange-500 text-orange-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* All pages */}
              {pageSubTab === "all" && (
                <>
                  <div className="grid grid-cols-[1fr_70px_70px_80px] gap-3 px-4 py-2 border-b border-zinc-800/40 text-xs text-zinc-600 uppercase tracking-wider">
                    <span>Sahifa</span>
                    <span className="text-right">Ko&apos;rish</span>
                    <span className="text-right">Unique</span>
                    <span className="text-right">Scroll</span>
                  </div>
                  {loading ? <SkeletonRows count={5} /> : pages.length === 0 ? <EmptyState /> : (
                    pages.map((page, i) => {
                      const scroll = page.avgScrollDepth;
                      const scrollColor = scroll === null ? "" : scroll >= 61 ? "text-green-400" : scroll >= 31 ? "text-yellow-400" : "text-red-400";
                      return (
                        <div key={page.path} className={`px-4 py-3 ${i < pages.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                          <div className="grid grid-cols-[1fr_70px_70px_80px] gap-3 items-center mb-1.5">
                            <p className="text-sm text-zinc-300 font-mono truncate">{page.path}</p>
                            <p className="text-sm font-semibold text-zinc-100 tabular-nums text-right">{fmt(page.views)}</p>
                            <p className="text-sm text-zinc-500 tabular-nums text-right">{fmt(page.uniqueVisitors)}</p>
                            <p className={`text-sm font-medium tabular-nums text-right ${scrollColor || "text-zinc-700"}`}>
                              {scroll !== null ? `↕ ${scroll}%` : "—"}
                            </p>
                          </div>
                          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${(page.views / maxViews) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* Entry pages */}
              {pageSubTab === "entry" && (
                <>
                  <div className="grid grid-cols-[1fr_100px] gap-4 px-4 py-2 border-b border-zinc-800/40 text-xs text-zinc-600 uppercase tracking-wider">
                    <span>Kirish sahifasi</span>
                    <span className="text-right">Kirishlar</span>
                  </div>
                  {loading ? <SkeletonRows count={5} /> : entryPages.length === 0 ? <EmptyState /> : (
                    entryPages.map((page, i) => (
                      <div key={page.path} className={`px-4 py-3 ${i < entryPages.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                        <div className="grid grid-cols-[1fr_100px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-zinc-300 font-mono truncate">{page.path}</p>
                          <p className="text-sm font-semibold text-zinc-100 tabular-nums text-right">{fmt(page.entries)}</p>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${(page.entries / maxEntries) * 100}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Exit pages */}
              {pageSubTab === "exit" && (
                <>
                  <div className="grid grid-cols-[1fr_80px_90px] gap-4 px-4 py-2 border-b border-zinc-800/40 text-xs text-zinc-600 uppercase tracking-wider">
                    <span>Chiqish sahifasi</span>
                    <span className="text-right">Chiqishlar</span>
                    <span className="text-right">Exit rate</span>
                  </div>
                  {loading ? <SkeletonRows count={5} /> : exitPages.length === 0 ? <EmptyState /> : (
                    exitPages.map((page, i) => (
                      <div key={page.path} className={`px-4 py-3 ${i < exitPages.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                        <div className="grid grid-cols-[1fr_80px_90px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-zinc-300 font-mono truncate">{page.path}</p>
                          <p className="text-sm font-semibold text-zinc-100 tabular-nums text-right">{fmt(page.exits)}</p>
                          <p className={`text-sm font-semibold tabular-nums text-right ${page.exitRate > 50 ? "text-red-400" : page.exitRate > 25 ? "text-yellow-400" : "text-green-400"}`}>
                            {page.exitRate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500/50 rounded-full" style={{ width: `${(page.exits / maxExits) * 100}%` }} />
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
        {activeTab === "sources" && (
          <Card>
            <CardContent className="p-0">
              {/* Subtabs */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-zinc-800/60">
                {([
                  { key: "referrers" as SourceSubTab, label: "Manbalar" },
                  { key: "campaigns" as SourceSubTab, label: `UTM Kampaniyalar${sources.campaigns.length ? ` (${sources.campaigns.length})` : ""}` },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSourceSubTab(key)}
                    className={`px-3 py-2 text-xs transition-all border-b-2 -mb-px ${
                      sourceSubTab === key
                        ? "border-orange-500 text-orange-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Referrers */}
              {sourceSubTab === "referrers" && (
                <>
                  <div className="grid grid-cols-[1fr_80px_64px] gap-4 px-4 py-2 border-b border-zinc-800/40 text-xs text-zinc-600 uppercase tracking-wider">
                    <span>Manba</span>
                    <span className="text-right">Tashrifchilar</span>
                    <span className="text-right">%</span>
                  </div>
                  {loading ? <SkeletonRows count={4} /> : sources.referrers.length === 0 ? <EmptyState /> : (
                    sources.referrers.map((src, i) => (
                      <div key={src.source} className={`px-4 py-3 ${i < sources.referrers.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                        <div className="grid grid-cols-[1fr_80px_64px] gap-4 items-center mb-1.5">
                          <p className="text-sm text-zinc-300 truncate">
                            {src.source === "direct" ? "To'g'ridan-to'g'ri" : src.source}
                          </p>
                          <p className="text-sm font-semibold text-zinc-100 tabular-nums text-right">{fmt(src.visitors)}</p>
                          <p className="text-sm text-zinc-500 tabular-nums text-right">{src.percentage.toFixed(1)}%</p>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${src.percentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* UTM Campaigns */}
              {sourceSubTab === "campaigns" && (
                <>
                  <div className="grid grid-cols-[1fr_1fr_1fr_70px_56px] gap-3 px-4 py-2 border-b border-zinc-800/40 text-xs text-zinc-600 uppercase tracking-wider">
                    <span>Manba</span>
                    <span>Medium</span>
                    <span>Kampaniya</span>
                    <span className="text-right">Tashrif</span>
                    <span className="text-right">%</span>
                  </div>
                  {loading ? <SkeletonRows count={4} /> : sources.campaigns.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-zinc-600">UTM parametrli tashrif yo&apos;q</p>
                      <p className="text-xs text-zinc-700 mt-1">
                        URL ga ?utm_source=... qo&apos;shing
                      </p>
                    </div>
                  ) : (
                    sources.campaigns.map((c, i) => (
                      <div key={`${c.source}-${c.medium}-${c.campaign}`} className={`px-4 py-3 ${i < sources.campaigns.length - 1 ? "border-b border-zinc-800/40" : ""}`}>
                        <div className="grid grid-cols-[1fr_1fr_1fr_70px_56px] gap-3 items-center mb-1.5">
                          <p className="text-sm text-zinc-300 truncate font-medium">{c.source || "—"}</p>
                          <p className="text-xs text-zinc-500 truncate">{c.medium || "—"}</p>
                          <p className="text-xs text-zinc-500 truncate">{c.campaign || "—"}</p>
                          <p className="text-sm font-semibold text-zinc-100 tabular-nums text-right">{fmt(c.visitors)}</p>
                          <p className="text-sm text-zinc-500 tabular-nums text-right">{c.percentage.toFixed(1)}%</p>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500/60 rounded-full" style={{ width: `${c.percentage}%` }} />
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
        {activeTab === "audience" && (
          <div className="grid grid-cols-3 gap-4">
            {/* Qurilmalar */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Qurilmalar
                </p>
                {loading ? (
                  <SkeletonRows count={3} compact />
                ) : (
                  <BreakdownList
                    items={audience?.devices ?? []}
                    barColor="bg-orange-500/60"
                    renderName={(name) => {
                      const Icon = deviceIcon(name);
                      return (
                        <span className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
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
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Brauzerlar
                </p>
                {loading ? (
                  <SkeletonRows count={4} compact />
                ) : (
                  <BreakdownList
                    items={audience?.browsers ?? []}
                    barColor="bg-blue-500/60"
                  />
                )}
              </CardContent>
            </Card>

            {/* Davlatlar */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                  Davlatlar
                </p>
                {loading ? (
                  <SkeletonRows count={5} compact />
                ) : (
                  <BreakdownList
                    items={audience?.countries ?? []}
                    barColor="bg-green-500/60"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {/* Events */}
        {activeTab === "events" && (
          <EventsTab websiteId={id} events={events} loading={loading} period={period} />
        )}
      </div>
    </div>
  );
}

// ─── EventsTab ────────────────────────────────────────────────────────────────

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
  const [detail, setDetail] = useState<Record<string, any[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  async function toggleEvent(name: string) {
    if (expanded === name) { setExpanded(null); return; }
    setExpanded(name);
    if (detail[name]) return;
    setDetailLoading(name);
    try {
      const rows = await websitesApi.getEventDetail(websiteId, name, period as any);
      setDetail((prev) => ({ ...prev, [name]: rows }));
    } finally {
      setDetailLoading(null);
    }
  }

  if (loading) return <SkeletonRows count={4} />;

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 border-dashed p-12 text-center">
        <p className="text-sm text-zinc-500 mb-1">Hali custom event qayd etilmagan</p>
        <p className="text-xs text-zinc-700 mb-3">
          Saytingizda quyidagi kodni chaqiring:
        </p>
        <pre className="inline-block text-xs text-orange-400 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono">
          {`metrix('Purchase', { price: 49 })`}
        </pre>
      </div>
    );
  }

  const maxCount = events[0]?.count ?? 1;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_80px_120px] gap-4 px-4 py-2 border-b border-zinc-800/60 text-xs text-zinc-600 uppercase tracking-wider">
          <span>Event nomi</span>
          <span className="text-right">Soni</span>
          <span className="text-right">Oxirgi</span>
        </div>

        {events.map((ev, i) => {
          const isOpen = expanded === ev.name;
          const isLoading = detailLoading === ev.name;
          const rows = detail[ev.name] ?? [];

          return (
            <div key={ev.name} className={i < events.length - 1 ? "border-b border-zinc-800/40" : ""}>
              {/* Event row */}
              <button
                onClick={() => toggleEvent(ev.name)}
                className="w-full grid grid-cols-[1fr_80px_120px] gap-4 items-center px-4 py-3 hover:bg-zinc-800/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOpen ? "bg-orange-500" : "bg-zinc-600"}`} />
                  <span className="text-sm font-medium text-zinc-200 truncate">{ev.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">{fmt(ev.count)}</span>
                  <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500/60 rounded-full"
                      style={{ width: `${(ev.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-600 text-right">
                  {ev.lastSeen ? timeAgo(ev.lastSeen) : "—"}
                </p>
              </button>

              {/* Detail rows */}
              {isOpen && (
                <div className="bg-zinc-950/50 border-t border-zinc-800/40 px-4 py-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-6 bg-zinc-800/40 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : rows.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-2">Ma&apos;lumot topilmadi</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-600 mb-2">
                        So&apos;nggi {rows.length} ta hodisa:
                      </p>
                      {rows.map((row) => (
                        <div key={row.id} className="flex items-start gap-3 py-1.5 border-b border-zinc-800/30 last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {row.path && (
                                <span className="text-xs text-zinc-500 font-mono">{row.path}</span>
                              )}
                              {row.country && (
                                <span className="text-xs text-zinc-700">{row.country}</span>
                              )}
                            </div>
                            {row.properties && Object.keys(row.properties).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Object.entries(row.properties).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="text-[10px] bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-400 font-mono"
                                  >
                                    {k}: <span className="text-orange-400">{String(v)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-700 shrink-0 mt-0.5">
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
  return "Hozir";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SkeletonRows({ count = 3, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3" : "p-4 space-y-3"}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-7 bg-zinc-800/40 rounded animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center text-sm text-zinc-600">
      Bu davr uchun ma&apos;lumot yo&apos;q
    </div>
  );
}
