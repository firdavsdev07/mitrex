'use client';

import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // `border` HAR BIR variantda bor — ko'rinmasligi kerak bo'lganda
          // `border-transparent`. Ilgari primary'da border yo'q edi, shuning
          // uchun u secondary'dan 2px past chiqardi va yonma-yon turganda
          // farq ko'rinardi. Balandlik endi `h-*` bilan qat'iy belgilangan,
          // `py-*` bilan emas — shrift o'lchami o'zgarsa ham siljimaydi.
          // `shadow-tile` + bosilganda 1px pastga siljish — tugma tekis
          // to'rtburchak emas, bosiladigan jism bo'lib his qilinadi.
          // `ghost` bunga kirmaydi: u ataylab tugmaga o'xshamasligi kerak.
          'inline-flex items-center justify-center gap-2 shrink-0 font-medium rounded-control border transition-all ease-standard duration-[var(--mx-dur-micro)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:translate-y-px',
          {
            'bg-accent hover:bg-accent-hover text-on-accent border-transparent shadow-card active:shadow-tile':
              variant === 'primary',
            'bg-surface-raised hover:bg-surface-hover text-ink border-line shadow-tile':
              variant === 'secondary',
            'text-ink-2 hover:text-ink hover:bg-surface-hover border-transparent active:translate-y-0':
              variant === 'ghost',
            'bg-negative-quiet hover:bg-negative-quiet-hover text-negative-ink border-negative-line shadow-tile':
              variant === 'danger',
          },
          {
            'h-8 text-caption px-3': size === 'sm',
            'h-10 text-body px-4': size === 'md',
            'h-12 text-body px-5': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { Button };
