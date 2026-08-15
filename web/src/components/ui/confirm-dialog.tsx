'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Input } from './input';

// Kodbazada destruktiv amallar himoyalanmagan edi: saytni o'chirish
// (butun analitika tarixi bilan birga) va alertni o'chirish bitta bosishda,
// tasdiqsiz bajarilardi. Yagona himoyalangan amal — jamoani o'chirish —
// brauzerning native `confirm()` oynasini ishlatardi.
//
// Bu komponent ikkita darajani beradi:
//   • oddiy tasdiqlash — qaytarib bo'ladigan yoki arzon amallar uchun
//   • `confirmText` — yozib tasdiqlash, tarixiy ma'lumot yo'qoladigan
//     amallar uchun (foydalanuvchi domen yoki nomni qo'lda yozadi)
//
// `consequence` majburiy emas, lekin bo'lgani ma'qul: nima yo'qolishini
// aniq nomlash — "14 oylik ma'lumot" — "Ishonchingiz komilmi?" dan
// ancha foydali.
interface ConfirmDialogProps {
  title: string;
  /** Nima sodir bo'lishini bir gapda ayting. */
  message: React.ReactNode;
  /** Aynan nima yo'qolishi — masalan «blog.example.com uchun 14 oylik ma'lumot». */
  consequence?: string;
  /** Berilsa, foydalanuvchi shu matnni aynan yozmaguncha tugma o'chiq turadi. */
  confirmText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  consequence,
  confirmText,
  confirmLabel = "Ha, o'chirilsin",
  cancelLabel = 'Bekor qilish',
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const locked = confirmText ? typed.trim() !== confirmText : false;

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            disabled={locked}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-2">{message}</p>

        {consequence && (
          <div className="rounded-control border border-negative-line bg-negative-quiet px-3 py-2.5">
            <p className="text-small text-negative-ink">
              Yo&apos;qoladi: {consequence}
            </p>
          </div>
        )}

        {confirmText && (
          <Input
            label={`Tasdiqlash uchun «${confirmText}» deb yozing`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            autoFocus
            autoComplete="off"
          />
        )}
      </div>
    </Modal>
  );
}
