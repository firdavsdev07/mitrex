import { cn } from '@/lib/utils';

// To'rtta alohida skeleton naqshi bor edi: `h-20 rounded-panel border
// border-line bg-surface`, `h-7 bg-surface-sunken rounded`,
// `h-12 rounded-control bg-surface-sunken`, `h-14 bg-surface …`. Har biri
// o'z sahifasida yozilgan, hech biri boshqasiga o'xshamaydi.
//
// Yuklanish holati kelayotgan narsaning shakliga o'xshashi kerak —
// shuning uchun bitta primitiv va uning ustida bir nechta tayyor shakl.

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-chip bg-surface-hover', className)}
      {...props}
    />
  );
}

/** Karta ro'yxati — ulanishlar, saytlar, alertlar. */
export function SkeletonCards({
  count = 3,
  height = 'h-20',
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('rounded-panel', height)} />
      ))}
    </div>
  );
}

/** Jadval qatorlari. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-7" />
      ))}
    </div>
  );
}

/** Grafik joyi — balandlik nisbat bilan, qat'iy piksel bilan emas. */
export function SkeletonChart({ className }: { className?: string }) {
  return <Skeleton className={cn('aspect-[16/6] min-h-60 w-full rounded-panel', className)} />;
}
