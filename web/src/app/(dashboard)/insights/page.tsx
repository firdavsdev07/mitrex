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
  ChevronDown,
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
import { uzDate, uzDateShort, uzTime } from '@/lib/date';

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
  WEEKLY: 'text-accent-ink',
  MONTHLY: 'text-accent-ink',
  YEARLY: 'text-info-ink',
  WEBSITE: 'text-info-ink',
  CUSTOM: 'text-positive-ink',
  POST: 'text-ink-2',
  DAILY: 'text-ink-2',
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

const fmtTime = uzTime;

// ─── Markdown renderer ─────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return (
        <strong key={i} className="text-ink font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code
          key={i}
          className="text-accent-ink bg-surface-sunken px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  return (
    // `max-w-reading` (68ch) — ilgari o'lchov umuman yo'q edi, shuning uchun
    // 1920px ekranda AI tahlili qatoriga ~200 belgi tushardi.
    <div className="text-[15px] text-ink-2 leading-7 space-y-2 max-w-reading">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith('## '))
          return (
            <h2
              key={i}
              className="text-lg font-bold text-ink mt-6 mb-2 first:mt-0"
            >
              {renderInline(line.slice(3))}
            </h2>
          );
        if (line.startsWith('### '))
          return (
            <h3
              key={i}
              className="text-base font-semibold text-ink mt-4 mb-1.5 first:mt-0"
            >
              {renderInline(line.slice(4))}
            </h3>
          );
        if (line.match(/^[-*]\s/))
          return (
            <div key={i} className="flex gap-2.5 ml-1">
              <span className="text-accent-ink mt-1.5 shrink-0 text-xs">●</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        if (line.match(/^\d+\.\s/)) {
          const dot = line.indexOf('. ');
          return (
            <div key={i} className="flex gap-2.5 ml-1">
              <span className="text-accent-ink font-bold shrink-0 w-5 mt-0.5 text-sm">
                {line.slice(0, dot)}.
              </span>
              <span>{renderInline(line.slice(dot + 2))}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-ink-2">
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
    <div className="bg-surface border border-line rounded-control px-2.5 py-1.5 text-xs shadow-xl">
      <p className="text-ink-3 mb-0.5">{label}</p>
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
      <div className="relative w-full max-w-sm rounded-panel border border-line bg-canvas shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-ink" />
            </div>
            <p className="text-sm font-semibold text-ink">Yangi tahlil</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Period */}
          <div>
            <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">
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
                    'text-accent-ink border-accent-line bg-accent-quiet hover:bg-accent-quiet-hover',
                },
                {
                  key: 'monthly',
                  label: 'Oylik',
                  sub: '30 kun',
                  endpoint: '/ai/insights/monthly',
                  Icon: CalendarDays,
                  color:
                    'text-accent-ink border-accent-line bg-accent-quiet hover:bg-accent-quiet',
                },
                {
                  key: 'yearly',
                  label: 'Yillik',
                  sub: '365 kun',
                  endpoint: '/ai/insights/yearly',
                  Icon: Calendar,
                  color:
                    'text-info-ink border-info-line bg-info-quiet hover:bg-info-quiet',
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
                    'flex flex-col items-center gap-1.5 p-3 rounded-panel border transition-all disabled:opacity-40',
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
              <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-panel border border-line hover:border-info-line hover:bg-info-quiet text-info-ink transition-all disabled:opacity-40 text-left"
                  >
                    {generating === `w-${w.id}` ? (
                      <div className="w-4 h-4 rounded-full border-2 border-info-line border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {w.name}
                      </p>
                      {w.domain && (
                        <p className="text-xs text-ink-3 truncate">
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
              <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-panel border border-line hover:border-positive-line hover:bg-positive-quiet text-positive-ink transition-all disabled:opacity-40 text-left"
                    >
                      {generating === `p-${c.id}` ? (
                        <div className="w-4 h-4 rounded-full border-2 border-positive-line border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <Link2 className="w-4 h-4 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {c.platform}
                        </p>
                        {c.platformUsername && (
                          <p className="text-xs text-ink-3">
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
  const color = TYPE_COLOR[insight.type] ?? 'text-ink-2';

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
      {/* Sarlavha karta boshida allaqachon bor — bu yerda faqat manba
          ma'lumoti va o'chirish tugmasi qoladi, takrorlanmaydi. */}
      <div className="mb-5 flex items-center gap-3 border-b border-line-subtle pb-4">
        <p className="min-w-0 flex-1 text-caption text-ink-3">
          {uzDate(insight.generatedAt)} · {fmtTime(insight.generatedAt)} ·{' '}
          {insight.provider}
          {insight.tokensUsed
            ? ` · ${insight.tokensUsed.toLocaleString()} token`
            : ''}
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Tahlilni o'chirish"
          title="O'chirish"
          className="shrink-0 rounded-control p-2 text-ink-3 transition-colors hover:bg-negative-quiet hover:text-negative-ink disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Charts section */}
      {(webTrend.length > 1 || platEntries.length > 0) && (
        <div className="mb-6 rounded-panel bg-surface border border-line-subtle overflow-hidden">
          {/* Web trend */}
          {webTrend.length > 1 && (
            <div className="p-4 border-b border-line-subtle">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-ink-3">
                  Sayt tashriflari ({days} kun)
                </p>
                <p className="text-sm font-bold text-ink">
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
                        stopColor="var(--mx-accent)"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="var(--mx-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--mx-chart-axis)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--mx-accent)"
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
                const color = PLATFORM_CHART_COLORS[platform] ?? 'var(--mx-accent)';
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
                        <p className="text-xs font-medium text-ink-2">
                          {platform}
                        </p>
                        {username && (
                          <p className="text-[10px] text-ink-3">
                            @{username}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink">
                          {latest?.followers?.toLocaleString() ?? '?'}
                        </p>
                        {growth && (
                          <p
                            className={`text-[10px] flex items-center gap-0.5 justify-end ${Number(growth) >= 0 ? 'text-positive-ink' : 'text-negative-ink'}`}
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
                          tick={{ fill: 'var(--mx-chart-axis)', fontSize: 9 }}
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

// ─── Xulosa satri ──────────────────────────────────────────────────────────
// Yopiq kartada nima yozilganini ko'rsatadi. Ilgari ro'yxatda faqat tur
// yorlig'i va vaqt turardi — ya'ni qaysi tahlilni ochishni taxmin qilish
// kerak edi. Endi birinchi mazmunli jumla ko'rinadi.
function gist(content: string): string {
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    const clean = line
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '');
    if (clean.length > 24) return clean;
  }
  return content.slice(0, 120);
}

// ─── Bo'sh holat ───────────────────────────────────────────────────────────

function WelcomeState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-quiet">
        <Bot className="h-7 w-7 text-accent-ink" />
      </div>
      <h2 className="text-heading text-ink">Birinchi tahlilni yarating</h2>
      <p className="mx-auto mt-2 max-w-sm text-small leading-relaxed text-ink-2">
        AI raqamlaringizni o&apos;qib, nima o&apos;zgarganini va keyingi hafta
        nima qilish kerakligini oddiy tilda aytib beradi.
      </p>
      <Button onClick={onNew} className="mt-6 gap-2">
        <Sparkles className="h-4 w-4" />
        Tahlil yaratish
      </Button>
    </div>
  );
}

// ─── Tahlil kartasi ────────────────────────────────────────────────────────

function InsightCard({
  insight,
  connections,
  open,
  onToggle,
  onDelete,
}: {
  insight: AiInsight;
  connections: Connection[];
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const Icon = TYPE_ICONS[insight.type] ?? Bot;

  return (
    <div
      className={cn(
        'rounded-panel border bg-surface transition-colors',
        open ? 'border-accent-line shadow-card' : 'border-line-subtle shadow-tile',
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-control',
            open ? 'bg-accent text-on-accent' : 'bg-accent-quiet text-accent-ink',
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded-chip bg-surface-sunken px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-wider text-ink-3">
              {TYPE_LABELS[insight.type] ?? insight.type}
            </span>
            <span className="text-caption text-ink-3">
              {uzDateShort(insight.generatedAt)}
              {' · '}
              {fmtTime(insight.generatedAt)}
            </span>
          </div>

          {/* Xulosa — yopiq holatda ham o'qiladi */}
          <p
            className={cn(
              'mt-2 text-body leading-relaxed text-ink',
              !open && 'line-clamp-2',
            )}
          >
            {insight.title ?? gist(insight.content)}
          </p>
        </div>

        <span
          aria-hidden="true"
          className={cn(
            'mt-1 shrink-0 text-ink-3 transition-transform',
            open && 'rotate-180',
          )}
        >
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>

      {open && (
        <div className="border-t border-line-subtle p-5">
          <InsightDetail
            insight={insight}
            connections={connections}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}

// ─── Asosiy sahifa ─────────────────────────────────────────────────────────
// Ilgari bu yerda ikkita ustun bor edi: 224px li tahlillar ro'yxati va
// o'qish paneli. Ilova sidebari bilan birga bu 432px navigatsiya degani
// edi. Endi bitta ustun: kartalar ro'yxati, birinchisi ochiq.

export default function InsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Ilgari bu yerda `catch` umuman yo'q edi: so'rov 401/500 bilan tugasa
  // ham foydalanuvchi «hali tahlil yo'q» degan bo'sh holatni ko'rardi.
  // Ya'ni «men hech narsa yaratmaganman» va «yuklab bo'lmadi» bir xil
  // ko'rinardi — shuning uchun ular endi ajratiladi.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.get<AiInsight[]>('/ai/insights', {
        params: { limit: 50 },
      });
      setInsights(res.data);
      if (res.data.length) setOpenId((cur) => cur ?? res.data[0].id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setLoadError(msg ?? "Tahlillarni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount, asosiy render tugagach ishlaydi
    load();
    websitesApi.list().then(setWebsites).catch(() => {});
    connectionsApi.list().then(setConnections).catch(() => {});
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
      if (res.data.length) setOpenId(res.data[0].id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'AI xatosi. API key tekshiring.');
    } finally {
      setGenerating(null);
    }
  }

  function handleDelete(id: string) {
    const remaining = insights.filter((i) => i.id !== id);
    setInsights(remaining);
    setOpenId(remaining[0]?.id ?? null);
  }

  const groups = groupByDate(insights);

  return (
    <div className="mx-auto max-w-wide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-title text-ink">AI tahlil</h1>
          <p className="mt-1.5 max-w-reading text-body text-ink-3">
            Raqamlaringiz nima demoqchi — oddiy tilda, amaliy maslahat bilan.
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          loading={!!generating}
          className="shrink-0 gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Yangi tahlil
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-panel border border-negative-line bg-negative-quiet px-4 py-3 text-small text-negative-ink">
          {error}
        </div>
      )}

      <div className="mt-7">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-panel border border-line-subtle bg-surface"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-4 rounded-panel border border-negative-line bg-negative-quiet px-6 py-10 text-center">
            <p className="text-body font-medium text-negative-ink">
              {loadError}
            </p>
            <Button variant="secondary" size="sm" onClick={load}>
              Qayta urinish
            </Button>
          </div>
        ) : !insights.length ? (
          <WelcomeState onNew={() => setShowModal(true)} />
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(({ label, items }) => (
              <section key={label}>
                <p className="mb-3 text-eyebrow uppercase tracking-wider text-ink-3">
                  {label}
                </p>
                <div className="flex flex-col gap-3">
                  {items.map((ins) => (
                    <InsightCard
                      key={ins.id}
                      insight={ins}
                      connections={connections}
                      open={openId === ins.id}
                      onToggle={() =>
                        setOpenId(openId === ins.id ? null : ins.id)
                      }
                      onDelete={() => handleDelete(ins.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

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
