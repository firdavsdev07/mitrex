'use client';

import { useState } from 'react';
import {
  MessageCircle,
  CreditCard,
  Code2,
  ShieldCheck,
  ArrowRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ── Data ────────────────────────────────────────── */
const categories = [
  { id: 'general', label: 'Umumiy', icon: MessageCircle },
  { id: 'pricing', label: 'Narxlar', icon: CreditCard },
  { id: 'technical', label: 'Texnik', icon: Code2 },
  { id: 'security', label: 'Xavfsizlik', icon: ShieldCheck },
];

type QA = {
  q: string;
  a: string;
  accent?: string;
  code?: string;
};

const faqs: Record<string, QA[]> = {
  general: [
    {
      q: 'Metrix nima va kim uchun?',
      a: "Metrix — solopreneur, indie hacker, kichik startaplar va kreatorlar uchun yagona analytics dashboard. YouTube, Telegram, Instagram va boshqa platformalaringizni bitta joyda ko'rasiz. Har kuni 5 ta ilovaga kirish o'rniga — bitta Metrix.",
      accent: 'orange',
    },
    {
      q: 'Bepul plan doim bepulmi?',
      a: "Ha, to'liq bepul. Kredit karta talab qilinmaydi, vaqt cheklovlari yo'q. 1 ta sayt, 2 ta platforma va 5,000 tashrif/oyga cheksiz foydalanishingiz mumkin.",
      accent: 'green',
    },
    {
      q: 'Qanday platformalar bilan ishlaydi?',
      a: "Hozir: YouTube, Telegram, Instagram, Facebook, Threads, Discord, Bluesky va o'z web saytingiz — 8 ta platforma. Tez kunda: Pinterest, Reddit, TikTok, LinkedIn.",
      accent: 'blue',
    },
    {
      q: "Ma'lumotlar qanchalik tez yangilanadi?",
      a: "Web sayt statistikasi real vaqtda ko'rinadi. Platforma statistikasi (YouTube, Telegram va h.k.) har 6 soatda avtomatik sinxronlanadi. Qo'lda ham sync qilishingiz mumkin.",
      accent: 'orange',
    },
  ],
  pricing: [
    {
      q: "Kredit karta kerak bo'ladimi?",
      a: "Bepul plan uchun umuman kerak emas. To'lov tizimini hech qachon ko'rmaysiz — shunchaki ro'yxatdan o'ting va ishlating.",
      accent: 'green',
    },
    {
      q: 'Istalgan vaqt bekor qila olamanmi?',
      a: "Ha, istalgan vaqt, hech qanday jazosiz. Bekor qilsangiz, davr oxirigacha to'liq imkoniyatlardan foydalanishingiz mumkin. Ma'lumotlaringiz 30 kun saqlanadi.",
      accent: 'orange',
    },
    {
      q: 'Starter va Pro orasidagi asosiy farq nima?',
      a: "Starter: 3 ta sayt, 50K tashrif/oy, AI haftalik hisobot, 1 yillik ma'lumot tarixi. Pro: cheksiz hamma narsa + workspace (jamoa), custom alertlar va API access.",
      accent: 'orange',
    },
    {
      q: "Yillik to'lov bor bo'ladimi?",
      a: "Hozircha faqat oylik to'lov mavjud. Yaqin orada yillik reja ham chiqadi — 2 oy bepul bo'ladi. Xabardor bo'lish uchun hello@metrix.io ga yozing.",
      accent: 'blue',
    },
  ],
  technical: [
    {
      q: 'Saytimga ulash qanchalik oson?',
      a: "Juda oson — 1 ta script tag qo'shsangiz tamom. Hech qanday backend o'zgarishi kerak emas, hech qanday API key bilan ishlamasangiz ham bo'ladi.",
      accent: 'orange',
      code: `<script src="https://app.metrix.io/track.js"\n  data-site="mk_live_abc123" defer></script>`,
    },
    {
      q: 'React, Next.js, Vue bilan ishlaydi?',
      a: 'Ha, barcha framework lar bilan. HTML snippet, React hook, Next.js Script komponenti yoki Vue setup — hammasida ishlaydi. Integratsiyalar sahifasida barcha misollar bor.',
      accent: 'blue',
    },
    {
      q: 'Custom eventlarni qanday yuboraman?',
      a: `Script yuklanganidan keyin window.metrix() funksiyasi paydo bo'ladi. Uni istalgan joyda chaqiring.`,
      accent: 'orange',
      code: `metrix('Purchase', { price: 49, plan: 'starter' })`,
    },
    {
      q: 'SPA (Single Page App) da ishlaydi?',
      a: "Ha. Track.js history.pushState ni override qiladi va sahifa o'zgarishlarini avtomatik ushlab qoladi. React Router, Next.js App Router, Vue Router — hammasi ishlaydi.",
      accent: 'green',
    },
  ],
  security: [
    {
      q: 'OAuth tokenlari qanday saqlanadi?',
      a: "Barcha access tokenlar encrypted holda saqlanadi. Biz hech qachon sizning nomingizdan hech narsa yozmaymiz yoki o'zgartirmaymiz — faqat statistikani o'qiymiz.",
      accent: 'green',
    },
    {
      q: 'Cookie ishlatiladi va GDPR-ga mosmi?',
      a: "Track.js hech qanday cookie ishlatmaydi. Sessiya identifikatori localStorage da saqlanadi. GDPR, CCPA va boshqa maxfiylik qonunlariga to'liq mos keladi.",
      accent: 'green',
    },
    {
      q: "Ma'lumotlarim o'chsa nima bo'ladi?",
      a: "Hisobni o'chirsangiz ham ma'lumotlaringiz 30 kun davomida tiklash uchun saqlanadi. 30 kundan keyin barcha ma'lumotlar to'liq o'chiriladi (GDPR talabi).",
      accent: 'orange',
    },
    {
      q: "Kim ma'lumotlarimni ko'ra oladi?",
      a: "Faqat siz va workspace a'zolaringiz. Metrix jamoasi texnik muammo vaqtidagina va faqat sizning ruxsatingiz bilan ma'lumotlarga kirishishi mumkin.",
      accent: 'blue',
    },
  ],
};


/* ── Accordion ────────────────────────────────────
   Ilgari barcha javoblar doim ochiq turardi — bo'lim juda uzun edi va
   savolni ko'z bilan topish qiyin. Endi bir vaqtda bittasi ochiq:
   ro'yxatni bir qarashda skanerlash mumkin.                          */
function QARow({
  qa,
  index,
  open,
  onToggle,
}: {
  qa: QA;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-panel-${index}`;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-panel border bg-surface transition-colors',
        open ? 'border-accent-line shadow-card' : 'border-line-subtle',
      )}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={cn(
            'shrink-0 font-mono text-caption tabular-nums transition-colors',
            open ? 'text-accent-ink' : 'text-ink-3',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        <h3 className="min-w-0 flex-1 text-body font-semibold leading-snug text-ink">
          {qa.q}
        </h3>

        {/* «+» ochilganda «×» ga aylanadi — holatni bitta belgi bildiradi */}
        <span
          aria-hidden="true"
          className={cn(
            'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all',
            open
              ? 'rotate-45 bg-accent text-on-accent'
              : 'bg-surface-sunken text-ink-3',
          )}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>

      <div
        id={panelId}
        className={cn(
          'grid transition-all duration-[var(--mx-dur-transition)] ease-standard',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pl-[3.25rem]">
            <p className="text-small leading-relaxed text-ink-2">{qa.a}</p>
            {qa.code && (
              <pre className="mt-3 overflow-x-auto rounded-control border border-line-subtle bg-surface-sunken px-3 py-2.5 font-mono text-caption leading-relaxed text-accent-ink">
                {qa.code}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────── */
export default function FaqSection() {
  const [active, setActive] = useState('general');
  const [openIndex, setOpenIndex] = useState(0);
  const questions = faqs[active] ?? [];

  function switchCategory(id: string) {
    setActive(id);
    setOpenIndex(0);
  }

  return (
    <section id="haqida" className="relative border-t border-line-subtle py-20 lg:py-28">
      <div className="relative z-10 mx-auto w-full max-w-landing px-4">
        {/* Sarlavha — boshqa bo'limlar bilan bir xil, markazda */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-accent-ink">FAQ</p>
          <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink text-balance sm:text-[2.75rem]">
            Savol bormi?
            <br />
            <span className="text-accent">Javob bor.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body leading-relaxed text-ink-2">
            Eng ko&apos;p so&apos;raladigan savollar — kategoriya tanlang.
          </p>
        </div>

        {/* Kategoriyalar — gorizontal, markazda. Ilgari chapdagi ustunda
            edi va markazlashtirilgan sarlavha bilan mos kelmasdi. */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {categories.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => switchCategory(id)}
                className={cn(
                  'flex h-10 items-center gap-2 rounded-full border px-4 text-small font-medium transition-all active:translate-y-px',
                  isActive
                    ? 'border-transparent bg-accent text-on-accent shadow-card'
                    : 'border-line bg-surface text-ink-2 shadow-tile hover:bg-surface-hover hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                <span
                  className={cn(
                    'text-eyebrow tabular-nums',
                    isActive ? 'text-on-accent/70' : 'text-ink-3',
                  )}
                >
                  {faqs[id].length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Savollar — o'qish uchun qulay kenglikda, sahifa bo'ylab emas */}
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
          {questions.map((qa, i) => (
            <QARow
              key={qa.q}
              qa={qa}
              index={i}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>

        {/* Aloqa */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 rounded-panel border border-line-subtle bg-surface px-6 py-7 text-center shadow-card">
          <p className="text-heading text-ink">Javob topa olmadingizmi?</p>
          <p className="text-small text-ink-2">
            Bizga to&apos;g&apos;ridan-to&apos;g&apos;ri yozing — odatda bir
            necha soatda javob beramiz.
          </p>
          <Link
            href="mailto:hello@metrix.io"
            className="mt-1 inline-flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-4 text-small font-semibold text-accent-ink shadow-tile transition-all hover:bg-surface-hover active:translate-y-px"
          >
            hello@metrix.io
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
