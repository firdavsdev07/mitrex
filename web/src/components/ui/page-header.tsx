import { cn } from '@/lib/utils';

// Bu naqsh o'n bir sahifada qo'lda takrorlangan edi:
//
//   <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">…</p>
//   <h1 className="text-lg font-semibold text-ink">…</h1>
//
// Naqshning o'zi yaxshi — eyebrow sahifaning qayerdaligini aytadi,
// sarlavha nima ekanini. Faqat u komponent emas edi, shuning uchun
// bo'shliqlar sahifadan sahifaga bir necha piksel farq qilardi.
interface PageHeaderProps {
  /** Bo'lim nomi — «Hisob», «Saytlar», «Kontent». */
  eyebrow?: string;
  title: string;
  /** Bitta gapli izoh — sahifa qaysi savolga javob berishini aytadi. */
  description?: string;
  /** O'ng tomondagi amallar: davr tanlagich, asosiy tugma. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Mobilda amallar sarlavha ostiga tushadi — ilgari hamma joyda
        // qat'iy `flex items-center justify-between` edi va tor ekranda
        // sarlavha bilan tugmalar bir-birini siqardi.
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-eyebrow uppercase text-ink-3">{eyebrow}</p>
        )}
        <h1 className="text-title text-ink mt-0.5">{title}</h1>
        {description && (
          <p className="text-body text-ink-3 mt-1.5 max-w-reading">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
