'use client';

import { cn } from '@/lib/utils';
import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-body text-ink-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            // `h-10` — Button `md` bilan bir xil (40px), shuning uchun input
            // va tugma bitta qatorda turganda tekis chiziladi. Ilgari
            // ikkalasi ham `py-2` edi, lekin borderlar farq qilgani uchun
            // amaldagi balandlik ham farq qilardi.
            'w-full h-10 px-3 text-body rounded-control border bg-surface-sunken text-ink placeholder:text-ink-faint outline-none transition-colors ease-standard duration-[var(--mx-dur-micro)]',
            error
              ? 'border-negative focus:border-negative focus:ring-1 focus:ring-negative-line'
              : 'border-line focus:border-line-strong focus:ring-1 focus:ring-line-strong',
            className,
          )}
          {...props}
        />
        {error && <p className="text-caption text-negative-ink">{error}</p>}
        {hint && !error && <p className="text-caption text-ink-3">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export { Input };
