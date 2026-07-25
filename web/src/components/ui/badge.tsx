import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'orange';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        {
          'bg-zinc-800 text-zinc-300 border border-zinc-700':
            variant === 'default',
          'bg-green-500/10 text-green-400 border border-green-500/20':
            variant === 'success',
          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20':
            variant === 'warning',
          'bg-red-500/10 text-red-400 border border-red-500/20':
            variant === 'danger',
          'bg-orange-500/10 text-orange-400 border border-orange-500/20':
            variant === 'orange',
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
