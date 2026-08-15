import { cn } from '@/lib/utils';

// O'n bir sahifada bo'sh holat bor edi va hammasi qo'lda yozilgan:
// bir xil shakl (ikonka → sarlavha → izoh → amal), lekin har xil
// padding (p-6, p-8, p-12), har xil ikonka o'lchami va har xil fon.
//
// Shakl to'g'ri edi — matnlar ham yaxshi yozilgan. Faqat komponent
// emas edi.
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** `inline` — jadval yoki karta ichida, ramkasiz va ixcham. */
  variant?: 'panel' | 'inline';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'panel',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        variant === 'panel'
          ? 'rounded-panel border border-dashed border-line px-6 py-10'
          : 'px-4 py-8',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 text-ink-faint [&>svg]:h-8 [&>svg]:w-8">
          {icon}
        </div>
      )}
      <p className="text-body font-medium text-ink-2">{title}</p>
      {description && (
        <p className="text-caption text-ink-3 mt-1 max-w-[42ch]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
