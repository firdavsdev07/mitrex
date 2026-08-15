'use client';

import { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Ilgari bitta qat'iy `max-w-sm` (384px) bor edi va u hamma narsa uchun
// ishlatilardi: bitta maydonli forma ham, workspaces'dagi to'rt tabli
// jamoa boshqaruv konsoli ham. Endi to'rtta o'lcham:
//
//   sm  420  — tasdiqlash, bitta savol
//   md  560  — odatiy forma
//   lg  720  — ko'p bo'limli forma, QR + kod
//   xl  960  — boshqaruv sirtlari (a'zolar, resurslar)
//
// Balandlik `85vh` bilan cheklangan: sarlavha va footer joyida qoladi,
// faqat tana qismi skroll qiladi. Ilgari cheklov umuman yo'q edi, shuning
// uchun uzun modal viewport'dan chiqib ketardi va ichki komponentlar
// o'zlaricha `max-h-60` qo'yib chetlab o'tishga urinardi.
const SIZES = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
} as const;

export type ModalSize = keyof typeof SIZES;

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Standart `sm` — mavjud chaqiruvlar o'zgarmasdan ishlashi uchun. */
  size?: ModalSize;
  /** Pastda yopishib turadigan amallar qatori. */
  footer?: React.ReactNode;
  description?: React.ReactNode;
}

export function Modal({
  title,
  onClose,
  children,
  size = 'sm',
  footer,
  description,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();

  // Escape bilan yopish va orqa fon skrollini to'xtatish. Ilgari modal
  // faqat fonga bosish bilan yopilardi — klaviatura bilan ishlayotgan
  // foydalanuvchi uni umuman yopa olmasdi.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          // Mobilda pastdan chiquvchi varaq (faqat yuqori burchaklari
          // yumaloq), `sm` dan boshlab markazdagi oyna.
          'relative flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-panel border border-line bg-surface-raised shadow-2xl',
          'sm:max-h-[85vh] sm:rounded-panel',
          SIZES[size],
        )}
      >
        {/* Sarlavha — skroll qilinmaydi */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-heading text-ink">
              {title}
            </h3>
            {description && (
              <p id={descId} className="text-caption text-ink-3 mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="-mr-1 -mt-1 shrink-0 rounded-control p-1 text-ink-3 transition-colors ease-standard duration-[var(--mx-dur-micro)] hover:bg-surface-hover hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tana — yagona skroll qiladigan qism */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer — skroll qilinmaydi */}
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line-subtle px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
