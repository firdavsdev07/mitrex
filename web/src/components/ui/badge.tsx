import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'orange';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-caption font-medium px-2 py-0.5 rounded-full',
        {
          'bg-surface-raised text-ink-2 border border-line':
            variant === 'default',
          'bg-positive-quiet text-positive-ink border border-positive-line':
            variant === 'success',
          // `warning` va `orange` ataylab bir xil: dizayn tizimida amber
          // yo'q — u aksent apelsini bilan chalkashadi. Ikkalasi ham
          // «e'tibor talab qiladi» ma'nosini beradi.
          'bg-accent-quiet text-accent-ink border border-accent-line':
            variant === 'warning' || variant === 'orange',
          'bg-negative-quiet text-negative-ink border border-negative-line':
            variant === 'danger',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
