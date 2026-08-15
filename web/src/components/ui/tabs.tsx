'use client';

import { cn } from '@/lib/utils';

// To'rtta mustaqil tab implementatsiyasi bor edi — posts, workspaces,
// websites/[id], settings. Hammasi bir xil g'oya (`border-b-2 -mb-px`),
// lekin har xil padding, har xil shrift o'lchami va har xil faol rang.
// websites/[id] da esa ikkinchi daraja ham bor — bir xil naqsh, yana
// bir marta qo'lda yozilgan.
//
// `size="sm"` — aynan o'sha ichki daraja uchun.

export interface TabItem<T extends string> {
  key: T;
  label: string;
  icon?: React.FC<{ className?: string }>;
  /** Yon tomonda ko'rsatiladigan son — «Events (3)» o'rniga. */
  count?: number;
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        // Tor ekranda tablar gorizontal skroll qiladi — ilgari ular
        // o'ralib ketardi va pastdagi chiziq buzilardi.
        'flex items-center gap-1 overflow-x-auto border-b border-line',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map(({ key, label, icon: Icon, count }) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              'group -mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 transition-colors ease-standard duration-[var(--mx-dur-micro)]',
              size === 'sm' ? 'px-3 py-2 text-caption' : 'px-4 py-2.5 text-body',
              active
                ? 'border-accent text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'rounded-chip px-1.5 py-0.5 text-eyebrow tabular-nums',
                  active
                    ? 'bg-accent-quiet text-accent-ink'
                    : 'bg-surface-hover text-ink-3',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
