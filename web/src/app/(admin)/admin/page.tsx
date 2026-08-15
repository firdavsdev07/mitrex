'use client';

import { useState, useEffect } from 'react';
import { Users, Globe, Link2, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { adminApi, type AdminStats, type SyncHealth } from '@/lib/api/admin';

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-100 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

// 6 soatlik sync cron'i jimgina to'xtab qolsa hech qanday xato ko'rinmaydi —
// ma'lumot shunchaki eskira boshlaydi. Shu sabab holat bitta qarashda
// tushunarli bo'lishi kerak: rang + "oxirgi sync qachon" + muammoli soni.
const SYNC_STATUS_META: Record<
  SyncHealth['status'],
  { label: string; dot: string; box: string }
> = {
  ok: {
    label: 'Ishlayapti',
    dot: 'bg-green-400',
    box: 'bg-green-500/8 border-green-500/15',
  },
  degraded: {
    label: 'Qisman eskirgan',
    dot: 'bg-amber-400',
    box: 'bg-amber-500/8 border-amber-500/15',
  },
  down: {
    label: "To'xtagan",
    dot: 'bg-red-400',
    box: 'bg-red-500/8 border-red-500/15',
  },
  idle: {
    label: 'Ulanish yo‘q',
    dot: 'bg-zinc-500',
    box: 'bg-zinc-500/8 border-zinc-700/40',
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'hech qachon';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  return `${Math.floor(hr / 24)} kun oldin`;
}

function SyncHealthCard({ health }: { health: SyncHealth }) {
  const meta = SYNC_STATUS_META[health.status];
  const { total, stale, failing } = health.connections;

  return (
    <div className={`rounded-xl border p-5 mb-8 ${meta.box}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-500">Sinxronizatsiya (6 soat)</span>
        </div>
        <span className="flex items-center gap-2 text-xs text-zinc-300">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {timeAgo(health.lastSyncAt)}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">oxirgi sync</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100 tabular-nums">
            {stale} / {total}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">
            {health.staleThresholdHours} soatdan eskirgan
          </p>
        </div>
        <div>
          <p
            className={`text-sm font-semibold tabular-nums ${
              failing > 0 ? 'text-red-400' : 'text-zinc-100'
            }`}
          >
            {failing}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">xatolik bilan</p>
        </div>
      </div>

      {health.byPlatform.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-1.5">
          {health.byPlatform.map((p) => (
            <div
              key={p.platform}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-zinc-400">{p.platform}</span>
              <span className="flex items-center gap-3 text-zinc-600">
                {p.failing > 0 && (
                  <span className="text-red-400">{p.failing} xato</span>
                )}
                <span className="tabular-nums">{p.total} ta</span>
                <span className="w-24 text-right">{timeAgo(p.lastSyncAt)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SyncHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
    // Sync holati asosiy statistikadan mustaqil — u yuklanmasa ham
    // sahifaning qolgani ko'rinishi kerak.
    adminApi.getSyncHealth().then(setHealth).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
            Admin
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
          Admin
        </p>
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Platform bo&apos;yicha umumiy statistika
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-4 h-4 text-blue-400" />}
          label="Jami foydalanuvchilar"
          value={stats?.totalUsers ?? 0}
          sub={`+${stats?.newUsersThisMonth ?? 0} bu oy`}
          color="bg-blue-500/8 border-blue-500/15"
        />
        <StatCard
          icon={<Link2 className="w-4 h-4 text-orange-400" />}
          label="Faol ulanishlar"
          value={stats?.activeConnections ?? 0}
          color="bg-orange-500/8 border-orange-500/15"
        />
        <StatCard
          icon={<Globe className="w-4 h-4 text-green-400" />}
          label="Jami saytlar"
          value={stats?.totalWebsites ?? 0}
          color="bg-green-500/8 border-green-500/15"
        />
        <StatCard
          icon={<Eye className="w-4 h-4 text-purple-400" />}
          label="Bu oylik ko'rishlar"
          value={stats?.totalViews ?? 0}
          color="bg-purple-500/8 border-purple-500/15"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-red-400" />}
          label="Bu oy yangi userlar"
          value={stats?.newUsersThisMonth ?? 0}
          color="bg-red-500/8 border-red-500/15"
        />
      </div>

      {health && <SyncHealthCard health={health} />}

      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5">
        <p className="text-sm text-zinc-500">
          Foydalanuvchilarni boshqarish uchun{' '}
          <a
            href="/admin/users"
            className="text-zinc-300 hover:text-white underline underline-offset-2"
          >
            Foydalanuvchilar
          </a>{' '}
          bo&apos;limiga o&apos;ting. Planlar va platformalarni sozlash uchun mos
          bo&apos;limlardan foydalaning.
        </p>
      </div>
    </div>
  );
}
