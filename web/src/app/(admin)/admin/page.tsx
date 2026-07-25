'use client';

import { useState, useEffect } from 'react';
import { Users, Globe, Link2, Eye, TrendingUp } from 'lucide-react';
import { adminApi, type AdminStats } from '@/lib/api/admin';
import { Card, CardContent } from '@/components/ui/card';

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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .finally(() => setLoading(false));
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
