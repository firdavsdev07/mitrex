import { Clock, BrainCircuit, Unlink, HelpCircle } from 'lucide-react';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  WebIcon,
} from '@/components/icons/platform-icons';

// Bu bo'lim uchta muammoni ko'rsatadi. Ular ketma-ketlik EMAS — shuning
// uchun ilgari turgan `01 / 02 / 03` raqamlari olib tashlandi: raqam
// tartib borligini bildiradi, bu yerda esa tartib yo'q.
//
// Ikkinchi kartaning maketi ilgari bo'sh kulrang to'rtburchaklar edi va
// «murakkab interfeys» emas, «yuklanmagan sahifa» bo'lib ko'rinardi.
// Endi u haqiqiy chalkashlikni ko'rsatadi: tushunarsiz atamalar va
// javobsiz savollar.

const tabs = [
  { Icon: WebIcon, label: 'Google Analytics', url: 'analytics.google.com' },
  { Icon: YouTubeIcon, label: 'YouTube Studio', url: 'studio.youtube.com' },
  { Icon: TelegramIcon, label: 'Telegram', url: 'web.telegram.org' },
  { Icon: InstagramIcon, label: 'Instagram', url: 'instagram.com' },
  { Icon: DiscordIcon, label: 'Discord', url: 'discord.com/channels' },
];

function TabsVisual() {
  return (
    <div className="flex flex-col gap-1.5">
      {tabs.map((t) => (
        <div
          key={t.label}
          className="flex items-center gap-2.5 rounded-control border border-line-subtle bg-surface-sunken px-3 py-2"
        >
          <t.Icon className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-eyebrow font-medium text-ink-2">
              {t.label}
            </p>
            <p className="truncate text-eyebrow text-ink-3">{t.url}</p>
          </div>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
        </div>
      ))}

      <div className="mt-1.5 flex items-center justify-center gap-2 rounded-control border border-negative-line bg-negative-quiet py-2">
        <Clock className="h-3.5 w-3.5 text-negative-ink" />
        <span className="text-caption font-semibold text-negative-ink">
          30 daqiqa / kun
        </span>
        <span className="text-eyebrow text-ink-3">= 180 soat/yil</span>
      </div>
    </div>
  );
}

// Chalkashlik = tushunarsiz atamalar, javobsiz savollar.
const jargon = [
  { term: 'Bounce rate', value: '68.4%' },
  { term: 'Sessions / Visits', value: '1.42' },
  { term: 'DAU / MAU', value: '0.19' },
  { term: 'Avg. engagement time', value: '00:47' },
  { term: 'CTR vs CPC', value: '2.1 / $0.34' },
];

function JargonVisual() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="rounded-control border border-line-subtle">
        {jargon.map(({ term, value }, i) => (
          <div
            key={term}
            className={`flex items-center gap-2 px-3 py-2 ${
              i < jargon.length - 1 ? 'border-b border-line-subtle' : ''
            }`}
          >
            <HelpCircle className="h-3 w-3 shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-eyebrow text-ink-3">
              {term}
            </span>
            <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-ink-2">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-2 rounded-control border border-line bg-surface-sunken py-2">
        <span className="text-caption text-ink-3">
          …bularning qaysi biri muhim?
        </span>
      </div>
    </div>
  );
}

const islands = [
  { Icon: YouTubeIcon, label: 'YouTube', fill: 62 },
  { Icon: TelegramIcon, label: 'Telegram', fill: 38 },
  { Icon: InstagramIcon, label: 'Instagram', fill: 74 },
  { Icon: DiscordIcon, label: 'Discord', fill: 45 },
  { Icon: BlueskyIcon, label: 'Bluesky', fill: 29 },
  { Icon: WebIcon, label: 'Sayt', fill: 56 },
];

function IslandsVisual() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-2">
        {islands.map(({ Icon, label, fill }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-control border border-line-subtle bg-surface-sunken p-2.5"
          >
            <Icon className="h-5 w-5" />
            <span className="text-eyebrow text-ink-3">{label}</span>
            <div className="h-1 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-line-strong"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-2 rounded-control border border-line bg-surface-sunken py-2">
        <Unlink className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-caption text-ink-3">
          Hech biri bir-biriga ulanmagan
        </span>
      </div>
    </div>
  );
}

const problems = [
  {
    Icon: Clock,
    title: 'Vaqt ketadi',
    description:
      "Har birida alohida login, alohida grafik. Kuniga yarim soat faqat raqam yig'ishga ketadi.",
    Visual: TabsVisual,
  },
  {
    Icon: BrainCircuit,
    title: 'Murakkab interfeys',
    description:
      "Google Analytics'ni o'rganish uchun kurs kerak. Siz esa biznesingiz bilan shug'ullanishingiz kerak.",
    Visual: JargonVisual,
  },
  {
    Icon: Unlink,
    title: "Umumiy rasm yo'q",
    description:
      "Sayt va sotsial tarmoqlar o'rtasidagi bog'liqlikni ko'rishning oddiy usuli yo'q.",
    Visual: IslandsVisual,
  },
];

export default function ProblemSection() {
  return (
    <section className="relative border-y border-line-subtle py-20 lg:py-28">
      <div className="relative z-10 mx-auto w-full max-w-landing px-4">
        {/* Sarlavha — hero va mahsulot bo'limi bilan bir xil ritmda,
            markazlashtirilgan. Ilgari chapga tekislangan edi va sahifa
            o'qish o'qi bo'lim o'rtasida sakrardi. */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-accent-ink">Muammo</p>
          <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink text-balance sm:text-[2.75rem]">
            Har kuni ertalab
            <br />
            <span className="text-ink-3">5 ta login, 5 ta parol…</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body leading-relaxed text-ink-2">
            Solopreneurlar va kreatorlar har kuni bir xil narsaga duch keladi:
            ketgan vaqt, tushunarsiz atamalar va yagona ko&apos;rinishning
            yo&apos;qligi.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {problems.map(({ Icon, title, description, Visual }) => (
            <div
              key={title}
              className="flex flex-col rounded-panel border border-line-subtle bg-surface p-6 shadow-card"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
                <Icon className="h-5 w-5 text-ink-3" />
              </div>

              <h3 className="mt-5 text-heading text-ink">{title}</h3>
              <p className="mt-2 text-small leading-relaxed text-ink-2">
                {description}
              </p>

              <div className="mt-5">
                <Visual />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-center text-body text-ink-3">
          Metrix bularning barchasini bitta ekranga sig&apos;diradi.
        </p>
      </div>
    </section>
  );
}
