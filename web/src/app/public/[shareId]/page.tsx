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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-lg text-zinc-300 mb-1">Dashboard topilmadi</p>
          <p className="text-sm text-zinc-600">
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
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-zinc-600">Ommaviy dashboard</p>
              <h1 className="text-lg font-semibold text-zinc-100">
                {loading ? '...' : (data?.website.name ?? '')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                  period === p
                    ? 'bg-orange-500/12 text-orange-400 border border-orange-500/20'
                    : 'text-zinc-600 hover:text-zinc-300'
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
              icon: <Users className="w-4 h-4 text-blue-400" />,
              label: 'Tashrifchilar',
              val: data?.overview.visitors,
              bg: 'bg-blue-500/8 border-blue-500/15',
            },
            {
              icon: <Eye className="w-4 h-4 text-orange-400" />,
              label: "Sahifa ko'rishlar",
              val: data?.overview.pageViews,
              bg: 'bg-orange-500/8 border-orange-500/15',
            },
            {
              icon: <TrendingUp className="w-4 h-4 text-red-400" />,
              label: 'Bounce rate',
              val: data ? `${data.overview.bounceRate.toFixed(1)}%` : undefined,
              bg: 'bg-red-500/8 border-red-500/15',
            },
          ].map(({ icon, label, val, bg }) => (
            <div key={label} className={`rounded-xl border p-4 ${bg}`}>
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
              {loading || val === undefined ? (
                <div className="h-8 w-16 bg-zinc-800/50 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                  {typeof val === 'number' ? fmt(val) : val}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <Card className="mb-5">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-zinc-200 mb-4">
              Tashrifchilar va ko&apos;rishlar dinamikasi
            </p>
            {loading ? (
              <div className="h-48 bg-zinc-800/30 rounded-lg animate-pulse" />
            ) : trendData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <Globe className="w-8 h-8 text-zinc-700" />
                <p className="text-sm text-zinc-600">
                  Bu davrda ma&apos;lumot yo&apos;q
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gPubViews" x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={fmt}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#71717a' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Ko'rishlar"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#gPubViews)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top pages */}
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-3 border-b border-zinc-800/60">
              <p className="text-sm font-medium text-zinc-200">Top sahifalar</p>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-6 bg-zinc-800/40 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : !data?.topPages.length ? (
              <p className="py-8 text-center text-sm text-zinc-600">
                Ma&apos;lumot yo&apos;q
              </p>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {data.topPages.map((p) => (
                  <div
                    key={p.path}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <p className="text-sm text-zinc-300 font-mono truncate">
                      {p.path}
                    </p>
                    <p className="text-sm font-semibold text-zinc-100 tabular-nums">
                      {fmt(p.views)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-700 mt-6">
          Metrix orqali quvvatlanadi
        </p>
      </div>
    </div>
  );
}
