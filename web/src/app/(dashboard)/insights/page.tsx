'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus,
  Bot,
  Globe,
  Link2,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  CalendarDays,
  Calendar,
  FileText,
  X,
  Sparkles,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { websitesApi, type Website } from '@/lib/api/websites';
import { connectionsApi, type Connection } from '@/lib/api/connections';
import {
  dashboardApi,
  type TrendPoint,
  type PlatformHistoryPoint,
} from '@/lib/api/dashboard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── types ────────────────────────────────────────────────────────────────────

interface AiInsight {
  id: string;
  type:
    'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'DAILY' | 'WEBSITE' | 'POST' | 'CUSTOM';
  title: string | null;
  content: string;
  provider: string;
  tokensUsed: number | null;
  generatedAt: string;
  connectionId: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  WEEKLY: 'Haftalik',
  MONTHLY: 'Oylik',
  YEARLY: 'Yillik',
  WEBSITE: 'Sayt tahlili',
  CUSTOM: 'Platforma tahlili',
  POST: 'Post tahlili',
  DAILY: 'Kunlik',
};

const TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  WEEKLY: BarChart2,
  MONTHLY: CalendarDays,
  YEARLY: Calendar,
  WEBSITE: Globe,
  CUSTOM: Link2,
  POST: FileText,
  DAILY: Clock,
};

const TYPE_COLOR: Record<string, string> = {
  WEEKLY: 'text-orange-400',
  MONTHLY: 'text-yellow-400',
  YEARLY: 'text-purple-400',
  WEBSITE: 'text-blue-400',
  CUSTOM: 'text-green-400',
  POST: 'text-zinc-400',
  DAILY: 'text-zinc-400',
};

const PLATFORM_CHART_COLORS: Record<string, string> = {
  YOUTUBE: '#ff4444',
  TELEGRAM: '#2AABEE',
  INSTAGRAM: '#E1306C',
  DISCORD: '#5865F2',
  BLUESKY: '#0085ff',
  REDDIT: '#FF4500',
};

// AI tahlil generatsiya qilish mumkin bo'lgan barcha platformalar — yangi
// platforma qo'shilganda shu yerga ham qo'shish kerak (backend istalgan
// platforma nomini qabul qiladi, bu yerdagi ro'yxat faqat UI filtri).
const AI_INSIGHT_PLATFORMS = [
  'YOUTUBE',
  'TELEGRAM',
  'INSTAGRAM',
  'DISCORD',
  'BLUESKY',
  'REDDIT',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupByDate(insights: AiInsight[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const groups: { label: string; items: AiInsight[] }[] = [
    { label: 'Bugun', items: [] },
    { label: 'Kecha', items: [] },
    { label: 'Bu hafta', items: [] },
    { label: 'Oldingi', items: [] },
  ];

  for (const ins of insights) {
    const d = new Date(ins.generatedAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() === today.getTime()) groups[0].items.push(ins);
    else if (day.getTime() === yesterday.getTime()) groups[1].items.push(ins);
    else if (day >= weekAgo) groups[2].items.push(ins);
    else groups[3].items.push(ins);
  }

  return groups.filter((g) => g.items.length > 0);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Markdown renderer ─────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return (
        <strong key={i} className="text-zinc-100 font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code
          key={i}
          className="text-orange-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="text-[15px] text-zinc-300 leading-7 space-y-2">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith('## '))
          return (
            <h2
              key={i}
              className="text-lg font-bold text-zinc-100 mt-6 mb-2 first:mt-0"
            >
              {renderInline(line.slice(3))}
            </h2>
          );
        if (line.startsWith('### '))
          return (
            <h3
              key={i}
              className="text-base font-semibold text-zinc-200 mt-4 mb-1.5 first:mt-0"
            >
              {renderInline(line.slice(4))}
            </h3>
          );
        if (line.match(/^[-*]\s/))
          return (
            <div key={i} className="flex gap-2.5 ml-1">
              <span className="text-orange-400 mt-1.5 shrink-0 text-xs">●</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        if (line.match(/^\d+\.\s/)) {
          const dot = line.indexOf('. ');
          return (
            <div key={i} className="flex gap-2.5 ml-1">
              <span className="text-orange-400 font-bold shrink-0 w-5 mt-0.5 text-sm">
                {line.slice(0, dot)}.
              </span>
              <span>{renderInline(line.slice(dot + 2))}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-zinc-300">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Mini chart tooltip ────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTip({
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
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs shadow-xl">
      <p className="text-zinc-500 mb-0.5">{label}</p>
      {payload.map((p) => {
        const value = p.value ?? 0;
        return (
          <p key={p.name} style={{ color: p.color }} className="font-semibold">
            {value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value}
          </p>
        );
      })}
    </div>
  );
}

// ─── Generate Modal ────────────────────────────────────────────────────────────

function GenerateModal({
  websites,
  connections,
  generating,
  onGenerate,
  onClose,
}: {
  websites: Website[];
  connections: Connection[];
  generating: string | null;
  onGenerate: (endpoint: string, key: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <p className="text-sm font-semibold text-zinc-100">Yangi tahlil</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Period */}
          <div>
            <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">
              Davr bo&apos;yicha
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: 'weekly',
                  label: 'Haftalik',
                  sub: '7 kun',
                  endpoint: '/ai/insights/weekly',
                  Icon: BarChart2,
                  color:
                    'text-orange-400 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10',
                },
                {
                  key: 'monthly',
                  label: 'Oylik',
                  sub: '30 kun',
                  endpoint: '/ai/insights/monthly',
                  Icon: CalendarDays,
                  color:
                    'text-yellow-400 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10',
                },
                {
                  key: 'yearly',
                  label: 'Yillik',
                  sub: '365 kun',
                  endpoint: '/ai/insights/yearly',
                  Icon: Calendar,
                  color:
                    'text-purple-400 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10',
                },
              ].map(({ key, label, sub, endpoint, Icon, color }) => (
                <button
                  key={key}
                  disabled={!!generating}
                  onClick={() => {
                    onGenerate(endpoint, key);
                    onClose();
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all disabled:opacity-40',
                    color,
                  )}
                >
                  {generating === key ? (
                    <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[10px] opacity-60">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Websites */}
          {websites.length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">
                Sayt tahlili
              </p>
              <div className="space-y-1">
                {websites.map((w) => (
                  <button
                    key={w.id}
                    disabled={!!generating}
                    onClick={() => {
                      onGenerate(`/ai/insights/website/${w.id}`, `w-${w.id}`);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800 hover:border-blue-500/30 hover:bg-blue-500/5 text-blue-400 transition-all disabled:opacity-40 text-left"
                  >
                    {generating === `w-${w.id}` ? (
                      <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {w.name}
                      </p>
                      {w.domain && (
                        <p className="text-xs text-zinc-600 truncate">
                          {w.domain}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Platforms */}
          {connections.filter((c) => AI_INSIGHT_PLATFORMS.includes(c.platform))
            .length > 0 && (
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">
                Platforma tahlili
              </p>
              <div className="space-y-1">
                {connections
                  .filter((c) => AI_INSIGHT_PLATFORMS.includes(c.platform))
                  .map((c) => (
                    <button
                      key={c.id}
                      disabled={!!generating}
                      onClick={() => {
                        onGenerate(
                          `/ai/insights/connection/${c.id}`,
                          `p-${c.id}`,
                        );
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-800 hover:border-green-500/30 hover:bg-green-500/5 text-green-400 transition-all disabled:opacity-40 text-left"
                    >
                      {generating === `p-${c.id}` ? (
                        <div className="w-4 h-4 rounded-full border-2 border-green-400 border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <Link2 className="w-4 h-4 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {c.platform}
                        </p>
                        {c.platformUsername && (
                          <p className="text-xs text-zinc-600">
                            @{c.platformUsername}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Insight Detail (right panel) ─────────────────────────────────────────────

function InsightDetail({
  insight,
  connections,
  onDelete,
}: {
  insight: AiInsight;
  connections: Connection[];
  onDelete: () => void;
}) {
  const [webTrend, setWebTrend] = useState<TrendPoint[]>([]);
  const [platHistories, setPlatHistories] = useState<
    Record<
      string,
      { platform: string; history: PlatformHistoryPoint[]; username: string | null }
    >
  >({});
  const [deleting, setDeleting] = useState(false);

  const Icon = TYPE_ICONS[insight.type] ?? Bot;
  const color = TYPE_COLOR[insight.type] ?? 'text-zinc-400';

  const isPeriod = ['WEEKLY', 'MONTHLY', 'YEARLY'].includes(insight.type);
  const days =
    insight.type === 'YEARLY' ? 365 : insight.type === 'MONTHLY' ? 30 : 14;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    setPlatHistories({});
    setWebTrend([]);

    if (isPeriod) {
      // Web trend
      dashboardApi
        .webTrend(days)
        .then(setWebTrend)
        .catch(() => {});
      // Barcha ulangan connectionlar tarixi (bitta platformada bir nechta
      // ulanish bo'lishi mumkin, shuning uchun connectionId bo'yicha).
      connections.forEach((c) => {
        dashboardApi
          .connectionHistory(c.id, days)
          .then((h) => {
            if (h?.history?.length) {
              setPlatHistories((prev) => ({
                ...prev,
                [c.id]: {
                  platform: h.platform,
                  history: h.history,
                  username: h.username,
                },
              }));
            }
          })
          .catch(() => {});
      });
    } else if (insight.type === 'CUSTOM' && insight.connectionId) {
      // Ushbu tahlil aynan qaysi ulanish uchun yaratilganini backend saqlagan
      // connectionId'dan bilamiz — title'dan taxmin qilish shart emas.
      dashboardApi
        .connectionHistory(insight.connectionId, 30)
        .then((h) => {
          if (h?.history?.length && insight.connectionId) {
            setPlatHistories({
              [insight.connectionId]: {
                platform: h.platform,
                history: h.history,
                username: h.username,
              },
            });
          }
        })
        .catch(() => {});
    } else if (insight.type === 'WEBSITE') {
      // Web trend for website insights
      dashboardApi
        .webTrend(30)
        .then(setWebTrend)
        .catch(() => {});
    }
    // `connections` ham qo'shilgan: agar /connections so'rovi /ai/insights'dan
    // keyin tugasa, birinchi ochilgan tahlil effekti bo'sh connections bilan
    // ishga tushib, platforma sparklinelarini umuman so'ramay qolardi —
    // connections keyinroq to'lganda effekt shu tahlil uchun qayta ishga tushadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight.id, connections]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiClient.delete(`/ai/insights/${insight.id}`);
      onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const totalViews = webTrend.reduce((s, t) => s + t.views, 0);
  const platEntries = Object.entries(platHistories);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/60 mb-6">
        <div
          className={cn(
            'w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0',
            color,
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-zinc-100">
            {insight.title ?? TYPE_LABELS[insight.type]}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {new Date(insight.generatedAt).toLocaleDateString('uz-UZ', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' · '}
            {fmtTime(insight.generatedAt)}
            {' · '}
            {insight.provider}
            {insight.tokensUsed
              ? ` · ${insight.tokensUsed.toLocaleString()} token`
              : ''}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
          title="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Charts section */}
      {(webTrend.length > 1 || platEntries.length > 0) && (
        <div className="mb-6 rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          {/* Web trend */}
          {webTrend.length > 1 && (
            <div className="p-4 border-b border-zinc-800/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500">
                  Sayt tashriflari ({days} kun)
                </p>
                <p className="text-sm font-bold text-zinc-100">
                  {totalViews.toLocaleString()}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={64}>
                <AreaChart
                  data={webTrend.map((t) => ({ ...t, date: fmtDate(t.date) }))}
                >
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#f97316"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#52525b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    fill="url(#cg)"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Platform sparklines */}
          {platEntries.length > 0 && (
            <div
              className={`grid p-4 gap-4 ${platEntries.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
            >
              {platEntries.map(([connectionId, { platform, history, username }]) => {
                const color = PLATFORM_CHART_COLORS[platform] ?? '#f97316';
                const latest = history[history.length - 1];
                const first = history[0];
                const growth =
                  first?.followers && latest?.followers
                    ? (
                        ((latest.followers - first.followers) /
                          first.followers) *
                        100
                      ).toFixed(1)
                    : null;
                return (
                  <div key={connectionId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-xs font-medium text-zinc-400">
                          {platform}
                        </p>
                        {username && (
                          <p className="text-[10px] text-zinc-600">
                            @{username}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-100">
                          {latest?.followers?.toLocaleString() ?? '?'}
                        </p>
                        {growth && (
                          <p
                            className={`text-[10px] flex items-center gap-0.5 justify-end ${Number(growth) >= 0 ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {Number(growth) >= 0 ? (
                              <TrendingUp className="w-2.5 h-2.5" />
                            ) : (
                              <TrendingDown className="w-2.5 h-2.5" />
                            )}
                            {Math.abs(Number(growth))}%
                          </p>
                        )}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={52}>
                      <LineChart
                        data={history.map((h) => ({
                          ...h,
                          date: fmtDate(String(h.date)),
                        }))}
                      >
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#52525b', fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTip />} />
                        <Line
                          type="monotone"
                          dataKey="followers"
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <MarkdownContent text={insight.content} />
      </div>
    </div>
  );
}

// ─── Empty / Welcome state ─────────────────────────────────────────────────────

function WelcomeState({ onNew }: { onNew: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-5">
        <Bot className="w-7 h-7 text-orange-400" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-100 mb-2">
        AI tahlil tayyor
      </h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
        Haftalik, oylik yoki yillik tahlil — platformalar va saytlaringiz haqida
        amaliy maslahat oling
      </p>
      <Button onClick={onNew} className="gap-2">
        <Sparkles className="w-4 h-4" />
        Yangi tahlil yaratish
      </Button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [selected, setSelected] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AiInsight[]>('/ai/insights', {
        params: { limit: 50 },
      });
      setInsights(res.data);
      // Keep selection valid
      if (res.data.length && !selected) setSelected(res.data[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    load();
    websitesApi
      .list()
      .then(setWebsites)
      .catch(() => {});
    connectionsApi
      .list()
      .then(setConnections)
      .catch(() => {});
  }, [load]);

  async function generate(endpoint: string, key: string) {
    setGenerating(key);
    setError(null);
    try {
      await apiClient.post(endpoint);
      const res = await apiClient.get<AiInsight[]>('/ai/insights', {
        params: { limit: 50 },
      });
      setInsights(res.data);
      if (res.data.length) setSelected(res.data[0]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'AI xatosi. API key tekshiring.');
    } finally {
      setGenerating(null);
    }
  }

  function handleDelete() {
    const remaining = insights.filter((i) => i.id !== selected?.id);
    setInsights(remaining);
    setSelected(remaining[0] ?? null);
  }

  const groups = groupByDate(insights);

  return (
    <div className="-m-6 flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* ── Left sidebar ── */}
      <div className="w-56 shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950">
        {/* New button */}
        <div className="p-3 border-b border-zinc-800/60">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 hover:border-orange-500/30 hover:bg-orange-500/5 text-zinc-400 hover:text-orange-400 transition-all text-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Yangi tahlil</span>
            {generating && (
              <div className="ml-auto w-3.5 h-3.5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Insight list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-3 space-y-2 mt-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-zinc-800/40 animate-pulse"
                />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-zinc-600">Hali tahlil yo&apos;q</p>
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <div key={label} className="mb-2">
                <p className="px-3 py-1 text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                  {label}
                </p>
                {items.map((ins) => {
                  const Icon = TYPE_ICONS[ins.type] ?? Bot;
                  const color = TYPE_COLOR[ins.type] ?? 'text-zinc-500';
                  const isActive = selected?.id === ins.id;

                  return (
                    <button
                      key={ins.id}
                      onClick={() => setSelected(ins)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 mx-0 group flex items-start gap-2.5 transition-all',
                        isActive
                          ? 'bg-zinc-800/80 border-r-2 border-orange-500'
                          : 'hover:bg-zinc-800/40 border-r-2 border-transparent',
                      )}
                    >
                      <Icon
                        className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', color)}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'text-xs font-medium truncate',
                            isActive ? 'text-zinc-100' : 'text-zinc-300',
                          )}
                        >
                          {ins.title ?? TYPE_LABELS[ins.type]}
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">
                          {fmtTime(ins.generatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto p-8">
        {selected ? (
          <InsightDetail
            key={selected.id}
            insight={selected}
            connections={connections}
            onDelete={handleDelete}
          />
        ) : (
          <WelcomeState onNew={() => setShowModal(true)} />
        )}
      </div>

      {/* Generate modal */}
      {showModal && (
        <GenerateModal
          websites={websites}
          connections={connections}
          generating={generating}
          onGenerate={generate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
