import { Bot, Bell, Users, Layers, Shield, Code2, Download } from 'lucide-react';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  WebIcon,
  Sparkline,
} from '@/components/icons/platform-icons';

// Ilgari bu ikkita alohida bo'lim edi — «Yechim» va «Imkoniyatlar» — va
// ikkalasi ham AYNAN bir xil narsani aytardi: dashboard, AI tahlil,
// alertlar, jamoa, real vaqt, script. Foydalanuvchi bir xil va'dani ikki
// marta o'qirdi, sahifa esa ikki barobar uzun edi.
//
// Endi bitta bo'lim: chapda mahsulotning o'zi ko'rinadi, o'ngda esa
// qisqa kartalar. Isbot va ro'yxat yonma-yon turadi, takrorlanmaydi.

const features = [
  {
    Icon: Layers,
    title: 'Barcha platformalar',
    body: "YouTube, Telegram, Instagram, Discord, Bluesky, Reddit va saytingiz — bitta ro'yxatda.",
  },
  {
    Icon: Bot,
    title: 'AI haftalik tahlil',
    body: "Har dushanba: nima o'sdi, nima tushdi va keyingi hafta nima qilish kerak.",
  },
  {
    Icon: Bell,
    title: 'Aqlli alertlar',
    body: 'Traffic keskin oshsa yoki tushsa — email yoki ilova orqali darhol xabar.',
  },
  {
    Icon: Users,
    title: 'Jamoa bilan',
    body: "Workspace yarating, a'zolarni taklif qiling, har biriga o'z ruxsatini bering.",
  },
];

const essentials = [
  { Icon: Shield, label: "Cookie-siz, GDPR'ga mos" },
  { Icon: Code2, label: '2 qatorlik integratsiya' },
  { Icon: Download, label: 'CSV / Google Sheets eksport' },
];

const channels = [
  { Icon: YouTubeIcon, name: 'YouTube', value: '3,891', delta: '+145', points: '0,20 12,16 24,14 36,10 48,6 60,3' },
  { Icon: TelegramIcon, name: 'Telegram', value: '892', delta: '+67', points: '0,18 12,15 24,13 36,10 48,8 60,5' },
  { Icon: InstagramIcon, name: 'Instagram', value: '2,100', delta: '+203', points: '0,20 12,17 24,11 36,14 48,8 60,4' },
  { Icon: WebIcon, name: 'Sayt', value: '1,247', delta: '+312', points: '0,22 12,18 24,15 36,11 48,7 60,3' },
];

const tiles = [
  { label: 'Tashrif', value: '1,247', delta: '+12%', tone: 'bg-tile-a' },
  { label: 'Obunachi', value: '7,783', delta: '+8%', tone: 'bg-tile-b' },
  { label: "A'zolar", value: '892', delta: '+5%', tone: 'bg-tile-c' },
  { label: "Ko'rishlar", value: '2,100', delta: '+23%', tone: 'bg-tile-d' },
];

const bars = [38, 52, 44, 68, 59, 86, 74];
const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

export default function ProductSection() {
  return (
    <section id="imkoniyatlar" className="relative py-20 lg:py-28">
      <div className="mx-auto w-full max-w-landing px-4">
        {/* ── Sarlavha ─────────────────────────────────── */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow uppercase text-accent-ink">Mahsulot</p>
          <h2 className="mt-3 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink text-balance sm:text-[2.75rem]">
            Hammasi bitta joyda.
            <br />
            <span className="text-accent">Chiroyli. Tez. Aqlli.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-body leading-relaxed text-ink-2">
            Bitta login, bitta dashboard. Platformalaringiz o&apos;zi
            sinxronlashadi, AI esa raqamlar nima demoqchiligini oddiy tilda
            aytib beradi.
          </p>
        </div>

        {/* ── Isbot + ro'yxat ──────────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-stretch">
          {/* Chap — mahsulotning o'zi */}
          <div className="overflow-hidden rounded-panel border border-line-subtle bg-surface shadow-pop">
            {/* Brauzer ramkasi */}
            <div className="flex items-center gap-1.5 border-b border-line-subtle px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-sunken" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-sunken" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-sunken" />
              <div className="flex flex-1 justify-center">
                <span className="rounded-control bg-surface-sunken px-4 py-0.5 text-eyebrow text-ink-3">
                  app.metrix.io/dashboard
                </span>
              </div>
              <span className="flex items-center gap-1 rounded-chip bg-positive-quiet px-1.5 py-0.5 text-eyebrow font-semibold text-positive-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Live
              </span>
            </div>

            <div className="p-5">
              <p className="text-eyebrow uppercase text-ink-3">
                Umumiy ko&apos;rinish
              </p>
              <p className="mt-1 text-heading text-ink">Bu hafta</p>

              {/* Pastel plitkalar — mahsulotdagi bilan aynan bir xil */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map(({ label, value, delta, tone }) => (
                  <div key={label} className={`rounded-control p-3 ${tone}`}>
                    <p className="text-eyebrow uppercase text-ink-3">{label}</p>
                    <p className="mt-1 text-heading font-bold text-ink tabular-nums">
                      {value}
                    </p>
                    <p className="text-eyebrow font-semibold text-positive-ink tabular-nums">
                      {delta}
                    </p>
                  </div>
                ))}
              </div>

              {/* Haftalik ustunlar */}
              <div className="mt-5 rounded-control border border-line-subtle p-4">
                <div className="flex items-center justify-between">
                  <p className="text-caption font-medium text-ink">
                    Haftalik tashrif
                  </p>
                  <span className="text-caption font-semibold text-positive-ink">
                    ↑ 23%
                  </span>
                </div>
                {/* Ustunlar aniq balandlikdagi flex ustun ichida turadi.
                    Ilgari ular to'g'ridan-to'g'ri `items-end` konteynerida
                    edi va `height: 38%` hisoblanadigan ota-element balandligi
                    `auto` bo'lgani uchun nolga tushardi — grafik ko'rinmasdi. */}
                <div className="mt-3 flex h-24 flex-col">
                  <div className="flex flex-1 items-end gap-2">
                    {bars.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-chip bg-accent"
                        style={{
                          height: `${h}%`,
                          opacity: 0.35 + (h / 100) * 0.65,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    {days.map((d) => (
                      <span
                        key={d}
                        className="flex-1 text-center text-eyebrow text-ink-3"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kanallar */}
              <div className="mt-4 rounded-control border border-line-subtle">
                {channels.map(({ Icon, name, value, delta, points }, i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      i < channels.length - 1 ? 'border-b border-line-subtle' : ''
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-caption text-ink-2">{name}</span>
                    <span className="text-caption font-semibold text-ink tabular-nums">
                      {value}
                    </span>
                    <Sparkline color="var(--mx-positive)" points={points} />
                    <span className="w-10 shrink-0 text-right text-caption font-semibold text-positive-ink tabular-nums">
                      {delta}
                    </span>
                  </div>
                ))}
              </div>

              {/* AI xulosasi */}
              <div className="mt-4 flex items-start gap-2.5 rounded-control border border-accent-line bg-accent-quiet p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-surface shadow-tile">
                  <Bot className="h-4 w-4 text-accent-ink" />
                </div>
                <p className="text-caption leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">AI:</span> Instagram
                  bu hafta 23% o&apos;sdi — shanba kuni eng yuqori.
                  Maslahat: keyingi hafta 3 ta rasm formatidagi post.
                </p>
              </div>
            </div>
          </div>

          {/* O'ng — imkoniyatlar */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:content-start">
            {features.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-panel border border-line-subtle bg-surface p-6 shadow-card transition-colors hover:border-accent-line"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-quiet">
                  <Icon className="h-5 w-5 text-accent-ink" />
                </div>
                <h3 className="mt-5 text-heading text-ink">{title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-2">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Qolgan muhim narsalar — karta emas, bitta qator ── */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-line-subtle pt-8">
          {essentials.map(({ Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-2.5 text-small text-ink-2"
            >
              <Icon className="h-4 w-4 shrink-0 text-ink-3" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
