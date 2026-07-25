'use client';

import { useState } from 'react';
import {
  MessageCircle,
  CreditCard,
  Code2,
  ShieldCheck,
  ArrowRight,
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

const accentMap: Record<string, string> = {
  orange: 'text-orange-400 bg-orange-500/8 border-orange-500/20',
  green: 'text-green-400  bg-green-500/8  border-green-500/20',
  blue: 'text-blue-400   bg-blue-500/8   border-blue-500/20',
};

/* ── QA Card ─────────────────────────────────────── */
function QACard({ qa, index }: { qa: QA; index: number }) {
  const accent = accentMap[qa.accent ?? 'orange'];

  return (
    <div
      className="group relative p-5 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all duration-200"
      style={{ animation: `fade-up 0.4s ease-out ${index * 0.06}s both` }}
    >
      {/* Number */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold tabular-nums',
            accent,
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 mb-2 leading-snug">
            {qa.q}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{qa.a}</p>

          {/* Code snippet */}
          {qa.code && (
            <div className="mt-3 px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-green-400 leading-relaxed whitespace-pre">
              {qa.code}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────── */
export default function FaqSection() {
  const [active, setActive] = useState('general');
  const questions = faqs[active] ?? [];

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #52525b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[100px]"
          style={{ animation: 'blob 16s ease-in-out 3s infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div
          className="mb-12"
          style={{ animation: 'fade-up 0.6s ease-out both' }}
        >
          <p className="text-xs uppercase tracking-widest text-orange-500/80 font-medium mb-3">
            FAQ
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-zinc-100">Savol bormi?</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              Javob bor.
            </span>
          </h2>
          <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
            Eng ko&apos;p so&apos;raladigan savollarni kategoriyalar bo&apos;yicha topishingiz
            mumkin.
          </p>
        </div>

        {/* Body: sidebar + content */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* ── Left: category nav ──────────────────── */}
          <div
            className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0"
            style={{ animation: 'fade-up 0.6s ease-out 0.1s both' }}
          >
            {categories.map((cat) => {
              const isActive = active === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActive(cat.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-200 shrink-0 md:shrink group w-full',
                    isActive
                      ? 'border-orange-500/30 bg-orange-500/8 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700',
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isActive
                        ? 'bg-orange-500/15 border border-orange-500/25'
                        : 'bg-zinc-800 border border-zinc-700/60 group-hover:bg-zinc-700/50',
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 transition-colors',
                        isActive
                          ? 'text-orange-400'
                          : 'text-zinc-500 group-hover:text-zinc-400',
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-none">
                      {cat.label}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] mt-1 transition-colors',
                        isActive ? 'text-zinc-500' : 'text-zinc-700',
                      )}
                    >
                      {faqs[cat.id].length} ta savol
                    </p>
                  </div>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Contact hint */}
            <div className="hidden md:block mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60">
              <p className="text-xs font-medium text-zinc-300 mb-1">
                Javob topa olmadingizmi?
              </p>
              <p className="text-[11px] text-zinc-600 mb-3 leading-relaxed">
                Bizga to&apos;g&apos;ridan-to&apos;g&apos;ri yozing
              </p>
              <Link
                href="mailto:hello@metrix.io"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 hover:text-orange-300 transition-colors"
              >
                hello@metrix.io
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* ── Right: Q&A cards ────────────────────── */}
          <div className="space-y-3">
            {questions.map((qa, i) => (
              <QACard key={qa.q} qa={qa} index={i} />
            ))}
          </div>
        </div>

        {/* Mobile contact */}
        <div className="md:hidden mt-8 text-center">
          <p className="text-xs text-zinc-600 mb-2">Javob topa olmadingizmi?</p>
          <Link
            href="mailto:hello@metrix.io"
            className="text-sm font-medium text-orange-400"
          >
            hello@metrix.io
          </Link>
        </div>
      </div>
    </section>
  );
}
