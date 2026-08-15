import { ArrowRight, Check, Sparkles, TrendingUp, Bot } from 'lucide-react';
import Link from 'next/link';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  WebIcon,
  Sparkline,
} from '@/components/icons/platform-icons';

// Ilgari hero chapga tekislangan ikki ustun edi: matn chapda, dashboard
// maketi o'ngda. Endi kompozitsiya markazlashtirilgan — sarlavha va CTA
// o'rtada, ostida uchta vizual ustun.
//
// Nima uchun shunday yaxshi: chap/o'ng bo'linishda ko'z ikki markaz orasida
// sakraydi va sarlavha o'z og'irligini yo'qotadi. Markazda esa o'qish
// tartibi bitta va aniq — VA'DA → HARAKAT → ISBOT.

const platformIcons = [
  { Icon: YouTubeIcon, label: 'YouTube' },
  { Icon: TelegramIcon, label: 'Telegram' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: DiscordIcon, label: 'Discord' },
  { Icon: BlueskyIcon, label: 'Bluesky' },
  { Icon: WebIcon, label: 'Web' },
];

// Chapdagi maket — ulangan kanallar
const channels = [
  {
    Icon: YouTubeIcon,
    name: 'YouTube',
    stat: '3,891',
    sub: 'obunachi',
    change: '+145',
    points: '0,20 12,16 24,14 36,10 48,6 60,3',
  },
  {
    Icon: TelegramIcon,
    name: 'Telegram',
    stat: '892',
    sub: "a'zo",
    change: '+67',
    points: '0,18 12,15 24,13 36,10 48,8 60,5',
  },
  {
    Icon: InstagramIcon,
    name: 'Instagram',
    stat: '2,100',
    sub: 'kuzatuvchi',
    change: '+203',
    points: '0,20 12,17 24,11 36,14 48,8 60,4',
  },
];

const trustPoints = [
  'Bir qatorli kod bilan ulanadi',
  'Barcha platformalar bitta joyda',
  'AI oddiy tilda tushuntiradi',
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* ── Fon ─────────────────────────────────────────────
          Iliq markaziy yorug'lik — sarlavhani ko'taradi, lekin o'zi
          e'tibor tortmaydi. Ilgari uchta harakatlanuvchi blob bor edi;
          markazlashtirilgan kompozitsiyada ular sarlavha bilan
          raqobatlashardi.                                            */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--mx-line) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage:
              'radial-gradient(ellipse 70% 60% at 50% 35%, #000 30%, transparent 75%)',
          }}
        />
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent-quiet blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-landing px-4">
        {/* ── Va'da ──────────────────────────────────────── */}
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm shadow-tile transition-colors hover:border-accent-line"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
            <span className="font-semibold text-accent-ink">
              Beta versiyada
            </span>
            {/* Tor ekranda tushuntirish qatori olib tashlanadi — aks holda
                tabletka ikki qatorga bo'linib, shaklini yo'qotadi. */}
            <span className="hidden text-ink-2 sm:inline">
              — hozir bepul boshlang, karta kerak emas.
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" />
          </Link>

          <h1 className="mt-8 text-[2.75rem] font-extrabold leading-[1.04] tracking-[-0.035em] text-ink text-balance sm:text-6xl lg:text-[4.25rem]">
            Barcha raqamlar,
            <br />
            <span className="text-accent">bitta joyda.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            YouTube, Telegram, Instagram va saytingiz — hammasi bitta
            dashboardda. Ertalab 1 daqiqada hamma narsa ko&apos;z oldingizda.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex h-12 items-center gap-2 rounded-control bg-accent px-7 text-body font-semibold text-on-accent shadow-card transition-all hover:bg-accent-hover active:translate-y-px"
            >
              Bepul boshlash
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex h-12 items-center gap-2 rounded-control border border-line bg-surface px-7 text-body font-medium text-ink shadow-tile transition-all hover:bg-surface-hover active:translate-y-px"
            >
              Demoni ko&apos;rish
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['Bepul plan bor', 'Karta kerak emas', '2 daqiqada'].map((t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 text-caption text-ink-3"
              >
                <Check className="h-3.5 w-3.5 text-positive-ink" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Isbot — uch ustun ───────────────────────────
            Chapda: nima ulanadi. O'rtada: qanday boshlash. O'ngda: nima
            olasiz. Ya'ni uchta ustun uchta savolga javob beradi, shunchaki
            uchta rasm emas.                                          */}
        <div className="mt-16 grid grid-cols-1 items-center gap-6 lg:mt-20 lg:grid-cols-3 lg:gap-5">
          {/* Chap — ulangan kanallar */}
          <div className="rounded-panel border border-line-subtle bg-surface p-5 shadow-card lg:-rotate-2">
            <p className="text-eyebrow uppercase text-ink-3">
              Kanallaringiz
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {channels.map(({ Icon, name, stat, sub, change, points }) => (
                <div key={name} className="flex items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-small font-semibold text-ink tabular-nums">
                      {stat}
                    </p>
                    <p className="text-eyebrow text-ink-3">{sub}</p>
                  </div>
                  <Sparkline color="var(--mx-positive)" points={points} />
                  <span className="w-10 shrink-0 text-right text-caption font-semibold text-positive-ink tabular-nums">
                    {change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* O'rta — boshlash kartasi. Referensdagi kabi eng baland qatlam. */}
          <div className="relative z-10 rounded-panel border border-line-subtle bg-surface p-6 shadow-pop lg:scale-105">
            <Link
              href="/register"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-control bg-accent text-body font-semibold text-on-accent shadow-card transition-all hover:bg-accent-hover active:translate-y-px"
            >
              <GoogleGlyph />
              Google bilan boshlash
            </Link>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-caption text-ink-3">yoki</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <Link
              href="/register"
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-control border border-line bg-surface text-body font-medium text-ink shadow-tile transition-all hover:bg-surface-hover active:translate-y-px"
            >
              Email bilan boshlash
            </Link>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-caption text-ink-3">
              <Check className="h-3.5 w-3.5 text-positive-ink" />
              Karta kerak emas.
              <span className="font-semibold text-accent-ink">Bepul!</span>
            </p>
          </div>

          {/* O'ng — nima olasiz */}
          <div className="flex flex-col gap-4 lg:rotate-2">
            <div className="rounded-panel border border-line-subtle bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-eyebrow uppercase text-ink-3">
                    Sayt tashriflari
                  </p>
                  <p className="mt-1 text-metric text-ink tabular-nums">1,247</p>
                </div>
                <span className="flex items-center gap-1 rounded-chip bg-positive-quiet px-1.5 py-0.5 text-caption font-semibold text-positive-ink">
                  <TrendingUp className="h-3 w-3" />
                  +24%
                </span>
              </div>
              <div className="mt-3">
                <Sparkline
                  color="var(--mx-accent)"
                  points="0,22 10,18 20,19 30,12 40,14 50,7 60,4"
                />
              </div>
              <p className="mt-2 text-caption text-ink-3">
                o&apos;tgan 7 kunga nisbatan
              </p>
            </div>

            <div className="rounded-panel border border-accent-line bg-accent-quiet p-4 shadow-tile">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface shadow-tile">
                  <Bot className="h-4 w-4 text-accent-ink" />
                </div>
                <div className="min-w-0">
                  <p className="text-small font-semibold text-ink">
                    AI tahlil tayyor
                  </p>
                  <p className="mt-0.5 text-caption leading-relaxed text-ink-2">
                    Telegram bu hafta +8% o&apos;sdi — sabab: seshanba kungi
                    post.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pastki qator ───────────────────────────────── */}
        <div className="mt-14 flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {trustPoints.map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 text-small text-ink-2"
              >
                <Check className="h-4 w-4 shrink-0 text-positive-ink" />
                {t}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {platformIcons.map(({ Icon, label }) => (
              <div
                key={label}
                title={label}
                className="flex h-9 w-9 items-center justify-center rounded-control border border-line-subtle bg-surface shadow-tile"
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
            <span className="ml-1 text-caption text-ink-3">+4 ta</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FFFFFF"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
