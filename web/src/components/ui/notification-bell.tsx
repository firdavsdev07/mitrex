'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react';
import { notificationsApi, type Notification } from '@/lib/api/notifications';

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} kun oldin`;
  if (h > 0) return `${h} soat oldin`;
  if (m > 0) return `${m} daq oldin`;
  return 'Hozir';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.count();
      setUnread(count);
    } catch {}
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
      setUnread(data.filter((n) => !n.readAt).length);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  // Unread count har 60 soniyada yangilanadi
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    loadCount();
    const iv = setInterval(loadCount, 60_000);
    return () => clearInterval(iv);
  }, [loadCount]);

  // Dropdown ochilganda to'liq ro'yxat yuklash
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Tashqariga click — yopish
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function flashError(message: string) {
    setError(message);
    setTimeout(() => setError(null), 4000);
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch {
      flashError('Bildirishnomani belgilashda xatolik yuz berdi');
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
      setUnread(0);
    } catch {
      flashError("Hammasini o'qilgan deb belgilashda xatolik yuz berdi");
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Bildirishnomalar"
        className="relative w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-9 w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-zinc-100">
              Bildirishnomalar
            </p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Hammasini o&apos;qi
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Yopish"
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border-b border-red-500/20 px-4 py-2">
              {error}
            </p>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-2.5 w-full bg-zinc-800/60 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-600">
                  Hali bildirishnoma yo&apos;q
                </p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                const Icon = cfg.icon;
                const isUnread = !n.readAt;
                const isLast = i === notifications.length - 1;

                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 transition-colors ${
                      isUnread ? 'bg-zinc-800/30' : ''
                    } ${!isLast ? 'border-b border-zinc-800/40' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold leading-snug ${isUnread ? 'text-zinc-100' : 'text-zinc-400'}`}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="shrink-0 w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 hover:bg-orange-400 transition-colors"
                            title="O'qilgan deb belgilash"
                          />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-zinc-700 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
