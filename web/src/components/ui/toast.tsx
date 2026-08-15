'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Kodbazada xabar berishning uchta usuli bor edi:
//   • brauzerning native `alert()` — oltita joyda
//   • sahifa ichidagi banner (`successMsg`/`errorMsg`) — layoutni surib
//     yuboradi, chunki u oqimda turadi
//   • `setTimeout(() => setMsg(null), 4000)` — har bir sahifada qaytadan
//
// Native `alert()` mahsulot ishlanganligi haqidagi taassurotni boshqa
// har qanday vizual detaldan ko'ra tezroq buzadi. Bu — bitta o'rniga.

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: React.ReactNode;
  /** ms; `0` — o'zi yopilmaydi. */
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: ({ tone, message, duration = 4000 }) =>
    set((s) => ({
      toasts: [...s.toasts, { id: nextId++, tone, message, duration }],
    })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Komponent ichida ham, undan tashqarida ham chaqirsa bo'ladi. */
export const toast = {
  success: (message: React.ReactNode, duration?: number) =>
    useToastStore.getState().push({ tone: 'success', message, duration }),
  error: (message: React.ReactNode, duration?: number) =>
    useToastStore.getState().push({ tone: 'error', message, duration }),
  info: (message: React.ReactNode, duration?: number) =>
    useToastStore.getState().push({ tone: 'info', message, duration }),
};

const TONE = {
  success: {
    Icon: CheckCircle2,
    box: 'border-positive-line bg-positive-quiet',
    fg: 'text-positive-ink',
  },
  error: {
    Icon: AlertTriangle,
    box: 'border-negative-line bg-negative-quiet',
    fg: 'text-negative-ink',
  },
  info: {
    Icon: Info,
    box: 'border-info-line bg-info-quiet',
    fg: 'text-info-ink',
  },
} as const;

function ToastRow({ toast: t }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const { Icon, box, fg } = TONE[t.tone];

  useEffect(() => {
    if (!t.duration) return;
    const timer = setTimeout(() => dismiss(t.id), t.duration);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, dismiss]);

  return (
    <div
      // `status` — xato bo'lsa ham: `alert` skrinriderni bo'lib yuboradi,
      // bu esa navbatda o'qiladi.
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 rounded-panel border px-3.5 py-3 shadow-lg backdrop-blur-sm',
        box,
      )}
    >
      <Icon className={cn('mt-px h-4 w-4 shrink-0', fg)} />
      <div className={cn('min-w-0 flex-1 text-small', fg)}>{t.message}</div>
      <button
        onClick={() => dismiss(t.id)}
        aria-label="Yopish"
        className={cn(
          'shrink-0 rounded-chip opacity-60 transition-opacity hover:opacity-100',
          fg,
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Ilova qobig'ida bir marta joylashtiriladi. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      // Mobilda pastda, desktopda o'ng pastda — ikkalasida ham asosiy
      // kontentni surib yubormaydi.
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col-reverse gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
    >
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} />
      ))}
    </div>
  );
}
