'use client';

import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Kodbazada sakkizta joyda xom `<select>` bor edi va har biri boshqacha
// bo'yalgan: kimida `text-xs`, kimida `text-[10px]`, kimida `py-0.5`,
// kimida mavjud bo'lmagan `border-zinc-850`. Balandliklari Input bilan
// hech qachon mos kelmagan.
//
// Bu — Input bilan bir xil qobiq: `h-10`, bir xil radius, bir xil fon,
// bir xil fokus holati. Shuning uchun forma qatorida yonma-yon turganda
// tekis chiziladi.
// Native `size` (ko'rinadigan qatorlar soni) olib tashlangan — bu yerda
// `size` balandlikni bildiradi, Button bilan bir xil so'z bilan.
interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  /** Ixcham variant — jadval qatori yoki topbar ichida. */
  size?: 'sm' | 'md';
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, size = 'md', children, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-body text-ink-2">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            className={cn(
              // `appearance-none` + o'z shevronimiz: native o'q har bir
              // platformada boshqacha ko'rinadi va qorong'i mavzuda
              // ko'pincha umuman ko'rinmaydi.
              'w-full appearance-none rounded-control border bg-surface-sunken text-ink outline-none transition-colors ease-standard duration-[var(--mx-dur-micro)]',
              size === 'sm' ? 'h-8 pl-2.5 pr-8 text-caption' : 'h-10 pl-3 pr-9 text-body',
              error
                ? 'border-negative focus:border-negative focus:ring-1 focus:ring-negative-line'
                : 'border-line focus:border-line-strong focus:ring-1 focus:ring-line-strong',
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-3',
              size === 'sm' ? 'right-2 h-3.5 w-3.5' : 'right-3 h-4 w-4',
            )}
          />
        </div>
        {error && <p className="text-caption text-negative-ink">{error}</p>}
        {hint && !error && <p className="text-caption text-ink-3">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
export { Select };
