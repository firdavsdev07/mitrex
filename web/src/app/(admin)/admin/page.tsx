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
    <div className={`rounded-panel border p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-ink-3">{label}</span>
      </div>
      <p className="text-3xl font-bold text-ink tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-ink-3 mt-1">{sub}</p>}
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
    dot: 'bg-positive',
    box: 'bg-positive-quiet border-positive-line',
  },
  degraded: {
    label: 'Qisman eskirgan',
    dot: 'bg-accent',
    box: 'bg-accent-quiet border-accent-line',
  },
  down: {
    label: "To'xtagan",
    dot: 'bg-negative',
    box: 'bg-negative-quiet border-negative-line',
  },
  idle: {
    label: 'Ulanish yo‘q',
    dot: 'bg-ink-faint',
    box: 'bg-surface-sunken border-line',
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
    <div className={`rounded-panel border p-5 mb-8 ${meta.box}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-ink-2" />
          <span className="text-xs text-ink-3">Sinxronizatsiya (6 soat)</span>
        </div>
        <span className="flex items-center gap-2 text-xs text-ink-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">
            {timeAgo(health.lastSyncAt)}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">oxirgi sync</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink tabular-nums">
            {stale} / {total}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">
            {health.staleThresholdHours} soatdan eskirgan
          </p>
        </div>
        <div>
          <p
            className={`text-sm font-semibold tabular-nums ${
              failing > 0 ? 'text-negative-ink' : 'text-ink'
            }`}
          >
            {failing}
          </p>
          <p className="text-xs text-ink-3 mt-0.5">xatolik bilan</p>
        </div>
      </div>

      {health.byPlatform.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line-subtle space-y-1.5">
          {health.byPlatform.map((p) => (
            <div
              key={p.platform}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-ink-2">{p.platform}</span>
              <span className="flex items-center gap-3 text-ink-3">
                {p.failing > 0 && (
                  <span className="text-negative-ink">{p.failing} xato</span>
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
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
            Admin
          </p>
          <h1 className="text-lg font-semibold text-ink">Overview</h1>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-panel border border-line bg-surface animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
          Admin
        </p>
        <h1 className="text-lg font-semibold text-ink">Overview</h1>
        <p className="text-sm text-ink-3 mt-1">
          Platform bo&apos;yicha umumiy statistika
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-4 h-4 text-info-ink" />}
          label="Jami foydalanuvchilar"
          value={stats?.totalUsers ?? 0}
          sub={`+${stats?.newUsersThisMonth ?? 0} bu oy`}
          color="bg-info-quiet border-info-line"
        />
        <StatCard
          icon={<Link2 className="w-4 h-4 text-accent-ink" />}
          label="Faol ulanishlar"
          value={stats?.activeConnections ?? 0}
          color="bg-accent-quiet border-accent-line"
        />
        <StatCard
          icon={<Globe className="w-4 h-4 text-positive-ink" />}
          label="Jami saytlar"
          value={stats?.totalWebsites ?? 0}
          color="bg-positive-quiet border-positive-line"
        />
        <StatCard
          icon={<Eye className="w-4 h-4 text-info-ink" />}
          label="Bu oylik ko'rishlar"
          value={stats?.totalViews ?? 0}
          color="bg-info-quiet border-info-line"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-negative-ink" />}
          label="Bu oy yangi userlar"
          value={stats?.newUsersThisMonth ?? 0}
          color="bg-negative-quiet border-negative-line"
        />
      </div>

      {health && <SyncHealthCard health={health} />}

      <div className="rounded-panel border border-line-subtle bg-surface p-5">
        <p className="text-sm text-ink-3">
          Foydalanuvchilarni boshqarish uchun{' '}
          <a
            href="/admin/users"
            className="text-ink-2 hover:text-ink underline underline-offset-2"
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
