'use client';

import { useState, useEffect } from 'react';
import { adminApi, type PlatformConfig } from '@/lib/api/admin';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminPlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getPlatforms()
      .then(setPlatforms)
      .finally(() => setLoading(false));
  }, []);

  async function toggle(
    slug: string,
    field: 'enabled' | 'comingSoon',
    current: boolean,
  ) {
    setToggling(slug + field);
    try {
      await adminApi.togglePlatform(slug, { [field]: !current });
      setPlatforms((prev) =>
        prev.map((p) => (p.slug === slug ? { ...p, [field]: !current } : p)),
      );
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
          Admin
        </p>
        <h1 className="text-lg font-semibold text-zinc-100">Platformalar</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Platformalarni yoqing/o&apos;chiring yoki &quot;Tez kunda&quot; belgisini boshqaring
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : platforms.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 border-dashed p-8 text-center text-sm text-zinc-600">
          Platform konfiguratsiyasi topilmadi. Seed ishlatib ko&apos;ring.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_110px] gap-4 px-4 py-2 border-b border-zinc-800/60 text-xs text-zinc-600 uppercase tracking-wider">
              <span>Platforma</span>
              <span className="text-center">Faol</span>
              <span className="text-center">Tez kunda</span>
            </div>

            {platforms.map((p, i) => {
              const isLast = i === platforms.length - 1;
              return (
                <div
                  key={p.slug}
                  className={`grid grid-cols-[1fr_100px_110px] gap-4 items-center px-4 py-3 ${
                    !isLast ? 'border-b border-zinc-800/40' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {p.displayName}
                    </p>
                    <p className="text-xs text-zinc-600 font-mono">{p.slug}</p>
                  </div>

                  {/* Enabled toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggle(p.slug, 'enabled', p.enabled)}
                      disabled={toggling === p.slug + 'enabled'}
                      className={`w-10 h-5.5 rounded-full border transition-colors flex items-center px-0.5 disabled:opacity-50 ${
                        p.enabled
                          ? 'bg-green-500/80 border-green-500'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      style={{ height: '22px', width: '42px' }}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                          p.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Coming soon toggle */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => toggle(p.slug, 'comingSoon', p.comingSoon)}
                      disabled={toggling === p.slug + 'comingSoon'}
                      className={`w-10 rounded-full border transition-colors flex items-center px-0.5 disabled:opacity-50 ${
                        p.comingSoon
                          ? 'bg-orange-500/80 border-orange-500'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      style={{ height: '22px', width: '42px' }}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                          p.comingSoon ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
        <p className="text-xs text-zinc-600">
          <span className="text-green-400">Faol</span> — foydalanuvchilar ulana
          oladi. <span className="text-orange-400">Tez kunda</span> — platforma
          ko&apos;rinadi lekin ulash mumkin emas.
        </p>
      </div>
    </div>
  );
}
