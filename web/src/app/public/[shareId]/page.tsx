'use client';

import { useState, useEffect, use } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Users, Eye, TrendingUp, Globe } from 'lucide-react';
import { websitesApi, type PublicSnapshot } from '@/lib/api/websites';
import { Card, CardContent } from '@/components/ui/card';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Bugun',
  week: 'Bu hafta',
  month: 'Bu oy',
};

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

export default function PublicDashboardPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<PublicSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    setLoading(true);
    websitesApi
      .getPublicSnapshot(shareId, period)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareId, period]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="text-center">
          <Globe className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="text-lg text-ink-2 mb-1">Dashboard topilmadi</p>
          <p className="text-sm text-ink-3">
            Havola o&apos;chirilgan yoki noto&apos;g&apos;ri bo&apos;lishi
            mumkin.
          </p>
        </div>
      </div>
    );
  }

  const trendData = (data?.trend ?? []).map((t) => ({
    ...t,
    date: fmtDate(t.date),
  }));

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-wide mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-ink" />
            </div>
            <div>
              <p className="text-xs text-ink-3">Ommaviy dashboard</p>
              <h1 className="text-lg font-semibold text-ink">
                {loading ? '...' : (data?.website.name ?? '')}
              </h1>
            </div>
          </div>
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

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            {
              icon: <Users className="w-4 h-4 text-info-ink" />,
              label: 'Tashrifchilar',
              val: data?.overview.visitors,
              bg: 'bg-info-quiet border-info-line',
            },
            {
              icon: <Eye className="w-4 h-4 text-accent-ink" />,
              label: "Sahifa ko'rishlar",
              val: data?.overview.pageViews,
              bg: 'bg-accent-quiet border-accent-line',
            },
            {
              icon: <TrendingUp className="w-4 h-4 text-negative-ink" />,
              label: 'Bounce rate',
              val: data ? `${data.overview.bounceRate.toFixed(1)}%` : undefined,
              bg: 'bg-negative-quiet border-negative-line',
            },
          ].map(({ icon, label, val, bg }) => (
            <div key={label} className={`rounded-panel border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-ink-3">{label}</span>
              </div>
              {loading || val === undefined ? (
                <div className="h-8 w-16 bg-surface-sunken rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-ink tabular-nums">
                  {typeof val === 'number' ? fmt(val) : val}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <Card className="mb-5">
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
                    <linearGradient id="gPubViews" x1="0" y1="0" x2="0" y2="1">
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
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--mx-ink-3)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Ko'rishlar"
                    stroke="var(--mx-accent)"
                    strokeWidth={2}
                    fill="url(#gPubViews)"
                    dot={false}
                    activeDot={{ r: 4, fill: 'var(--mx-accent)' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-line-subtle">
              <p className="text-sm font-medium text-ink">Top sahifalar</p>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 bg-surface-sunken rounded animate-pulse"
                  />
                ))}
              </div>
            ) : !data?.topPages.length ? (
              <p className="py-8 text-center text-sm text-ink-3">
                Ma&apos;lumot yo&apos;q
              </p>
            ) : (
              <div className="divide-y divide-line">
                {data.topPages.map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <p className="text-sm text-ink-2 font-mono truncate">
                      {p.path}
                    </p>
                    <p className="text-sm font-semibold text-ink tabular-nums">
                      {fmt(p.views)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-ink-3 mt-6">
          Metrix orqali quvvatlanadi
        </p>
      </div>
    </div>
  );
}
