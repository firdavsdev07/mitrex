import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge to'qnashuvchi klasslarni tashlab yuboradi, lekin buning
// uchun har bir klass qaysi guruhga tegishli ekanini bilishi kerak. Bizning
// dizayn tizimimizda `text-*` ikki xil ma'noda ishlatiladi:
//
//   o'lcham  → text-metric, text-title, text-heading, text-body, …
//   rang     → text-ink, text-accent-ink, text-on-accent, …
//
// Standart sozlamada twMerge bularning hammasini bitta guruh deb biladi va
// keyingisi oldingisini o'chiradi. Amalda bu shunday ko'rinardi:
//
//   cn('bg-accent text-on-accent', 'text-body')  →  'bg-accent text-body'
//
// ya'ni Button'ning birlamchi variantida matn rangi YO'QOLARDI va tugma
// apelsin fon ustida qora matn bilan chiqardi. Shuning uchun ikkala
// guruhni aniq e'lon qilamiz.
const FONT_SIZES = [
  'metric',
  'title',
  'heading',
  'body',
  'small',
  'caption',
  'eyebrow',
] as const;

const COLORS = [
  'canvas',
  'surface',
  'surface-raised',
  'surface-sunken',
  'surface-hover',
  'ink',
  'ink-2',
  'ink-3',
  'ink-faint',
  'line',
  'line-subtle',
  'line-strong',
  'accent',
  'accent-hover',
  'accent-ink',
  'accent-quiet',
  'accent-quiet-hover',
  'accent-line',
  'on-accent',
  'positive',
  'positive-ink',
  'positive-quiet',
  'positive-line',
  'negative',
  'negative-ink',
  'negative-quiet',
  'negative-quiet-hover',
  'negative-line',
  'info',
  'info-ink',
  'info-quiet',
  'info-line',
  'chart-grid',
  'chart-axis',
  'tile-a',
  'tile-b',
  'tile-c',
  'tile-d',
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZES] }],
      'text-color': [{ text: [...COLORS] }],
      'bg-color': [{ bg: [...COLORS] }],
      'border-color': [{ border: [...COLORS] }],
      rounded: [{ rounded: ['chip', 'control', 'panel'] }],
      shadow: [{ shadow: ['tile', 'card', 'pop'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
