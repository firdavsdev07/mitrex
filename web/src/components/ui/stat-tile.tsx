import { cn } from '@/lib/utils';

// Referensdagi imzo element: chegarasiz pastel plitka, ustida OQ dumaloq
// kvadratdagi ikonka, yirik qalin son, ostida yorliq va bitta izoh qatori.
//
// Nima uchun chegara yo'q: to'rtta plitka yonma-yon turganda har birining
// ramkasi bo'lsa, qator «jadval» ga aylanadi. Tusli fon guruhni ham,
// ajralishni ham o'zi hal qiladi.
//
// Ranglar SEMANTIK EMAS — «yaxshi/yomon» degani emas. Ular qatordagi o'rni
// bo'yicha aylanadi. O'sish yoki tushish `delta` orqali beriladi.
const TONES = {
  a: 'bg-tile-a',
  b: 'bg-tile-b',
  c: 'bg-tile-c',
  d: 'bg-tile-d',
  plain: 'bg-surface border border-line-subtle',
} as const;

export type TileTone = keyof typeof TONES;

interface StatTileProps {
  icon?: React.ReactNode;
  /** Asosiy son. `null` — hali yuklanmoqda. */
  value: React.ReactNode;
  label: string;
  /** Bitta izoh qatori — «Bu oy», «Hali ma'lumot yo'q». */
  hint?: string;
  /** Oldingi davrga nisbatan o'zgarish, foizda. */
  delta?: number | null;
  tone?: TileTone;
  loading?: boolean;
  className?: string;
}

export function StatTile({
  icon,
  value,
  label,
  hint,
  delta,
  tone = 'a',
  loading,
  className,
}: StatTileProps) {
  return (
    <div className={cn('rounded-panel p-5', TONES[tone], className)}>
      {icon && (
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-control bg-surface text-ink shadow-tile [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </div>
      )}

      {loading ? (
        <div className="h-9 w-20 animate-pulse rounded-chip bg-surface/70" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-[2rem] font-bold leading-none tracking-tight text-ink tabular-nums">
            {value}
          </p>
          {delta != null && (
            <span
              className={cn(
                'text-caption font-semibold tabular-nums',
                delta >= 0 ? 'text-positive-ink' : 'text-negative-ink',
              )}
            >
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-body font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-caption text-ink-3">{hint}</p>}
    </div>
  );
}
