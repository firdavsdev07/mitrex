import {
  Globe,
  Bot,
  Zap,
  Bell,
  Download,
  Code2,
  Monitor,
  Smartphone,
} from 'lucide-react';

/* ── Visuals ─────────────────────────────────────── */

function WebAnalyticsVisual() {
  const pages = [
    { path: '/blog/analytics', views: 342, pct: 100 },
    { path: '/pricing', views: 218, pct: 64 },
    { path: '/', views: 187, pct: 55 },
    { path: '/docs/quickstart', views: 143, pct: 42 },
    { path: '/features', views: 98, pct: 29 },
  ];

  return (
    <div className="mt-5 space-y-3">
      {/* Area chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-500">Tashrif dinamikasi</span>
          <span className="text-[10px] font-semibold text-green-400">
            ↑ 23%
          </span>
        </div>
        <svg
          viewBox="0 0 220 52"
          className="w-full"
          preserveAspectRatio="none"
          style={{ height: 52 }}
        >
          <defs>
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,46 L31,40 L62,43 L93,28 L124,32 L155,16 L186,20 L220,6 L220,52 L0,52 Z"
            fill="url(#area-grad)"
          />
          <path
            d="M0,46 L31,40 L62,43 L93,28 L124,32 L155,16 L186,20 L220,6"
            fill="none"
            stroke="#f97316"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex justify-between mt-1">
          {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => (
            <span key={d} className="text-[8px] text-zinc-700">
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Top pages */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
          <span className="text-[10px] font-medium text-zinc-400">
            Top sahifalar
          </span>
          <span className="text-[10px] text-zinc-600">Ko&apos;rishlar</span>
        </div>
        {pages.map((p) => (
          <div
            key={p.path}
            className="px-3 py-2 border-b border-zinc-800/40 last:border-0 group hover:bg-zinc-800/20 transition-colors"
          >
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-mono">
                {p.path}
              </span>
              <span className="text-[10px] font-semibold text-zinc-300">
                {p.views}
              </span>
            </div>
            <div className="h-0.5 bg-zinc-800 rounded-full">
              <div
                className="h-0.5 bg-orange-500/70 rounded-full transition-all duration-700"
                style={{ width: `${p.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Device split */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
          <Monitor className="w-4 h-4 text-zinc-500" />
          <div>
            <p className="text-[10px] font-semibold text-zinc-200">62%</p>
            <p className="text-[9px] text-zinc-600">Desktop</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
          <Smartphone className="w-4 h-4 text-zinc-500" />
          <div>
            <p className="text-[10px] font-semibold text-zinc-200">38%</p>
            <p className="text-[9px] text-zinc-600">Mobile</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiReportVisual() {
  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      {/* Email header */}
      <div className="px-3 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Bot className="w-2.5 h-2.5 text-orange-400" />
          </div>
          <span className="text-[10px] text-zinc-500">ai@metrix.io</span>
        </div>
        <p className="text-[11px] font-semibold text-zinc-200">
          Haftalik tahlil — 16-22 Iyun
        </p>
      </div>
      {/* Email body */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-orange-400 text-[10px] font-bold shrink-0">
            ↑
          </span>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Saytga 1,247 tashrif — o&apos;tgan haftadan{' '}
            <span className="text-green-400 font-medium">+12%</span>
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-orange-400 text-[10px] font-bold shrink-0">
            ↑
          </span>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            YouTube: <span className="text-green-400 font-medium">+145</span>{' '}
            yangi obunachi
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-orange-400 text-[10px] font-bold shrink-0">
            !
          </span>
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            Bounce rate <span className="text-yellow-400 font-medium">68%</span>{' '}
            — landing page ni optimallashtiring
          </p>
        </div>
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <p className="text-[10px] font-semibold text-orange-400">
            Keyingi hafta uchun maslahat:
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Chorshanba va Shanba kuni post yuboring — bu kunlar eng faol
          </p>
        </div>
      </div>
    </div>
  );
}

function RealtimeVisual() {
  const pages = [
    { path: '/pricing', count: 5 },
    { path: '/blog', count: 4 },
    { path: '/', count: 3 },
  ];
  return (
    <div className="mt-4 space-y-3">
      {/* Live counter */}
      <div className="flex items-center gap-4 p-3 rounded-xl border border-green-500/15 bg-green-500/5">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border border-green-500/20 bg-green-500/8 flex items-center justify-center">
            <span className="text-2xl font-black text-green-400 tabular-nums">
              12
            </span>
          </div>
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950"
            style={{
              animation: 'ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-950" />
        </div>
        <div>
          <p className="text-sm font-bold text-green-300">Faol tashrif</p>
          <p className="text-xs text-zinc-500">Hozir onlayn</p>
        </div>
      </div>
      {/* Active pages */}
      <div className="space-y-1.5">
        {pages.map((p) => (
          <div
            key={p.path}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40"
          >
            <div
              className="w-1.5 h-1.5 rounded-full bg-green-500"
              style={{ animation: 'ping-slow 2s ease-in-out infinite' }}
            />
            <span className="text-[10px] text-zinc-400 font-mono flex-1">
              {p.path}
            </span>
            <span className="text-[10px] font-bold text-zinc-300">
              {p.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingScriptVisual() {
  const lines = [
    {
      num: 1,
      tokens: [
        { t: '<', c: 'text-zinc-600' },
        { t: 'script', c: 'text-blue-400' },
      ],
    },
    {
      num: 2,
      tokens: [
        { t: '  src', c: 'text-yellow-300/80' },
        { t: '=', c: 'text-zinc-500' },
        { t: '"https://app.metrix.io/track.js"', c: 'text-green-400' },
      ],
    },
    {
      num: 3,
      tokens: [
        { t: '  data-site', c: 'text-yellow-300/80' },
        { t: '=', c: 'text-zinc-500' },
        { t: '"mk_live_abc123"', c: 'text-orange-400' },
      ],
    },
    { num: 4, tokens: [{ t: '  defer', c: 'text-purple-400' }] },
    {
      num: 5,
      tokens: [
        { t: '>', c: 'text-zinc-600' },
        { t: '</', c: 'text-zinc-600' },
        { t: 'script', c: 'text-blue-400' },
        { t: '>', c: 'text-zinc-600' },
      ],
    },
  ];

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-zinc-800 bg-[#0d0d12] overflow-hidden">
        {/* Editor bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
            </div>
            <span className="text-[10px] text-zinc-600 font-mono ml-1">
              index.html
            </span>
          </div>
          <span className="text-[9px] text-zinc-700 font-mono">HTML</span>
        </div>

        {/* Line numbers + code */}
        <div className="flex font-mono text-[11px] leading-6 p-3 gap-3">
          {/* Line numbers */}
          <div className="flex flex-col items-end select-none shrink-0">
            {lines.map((l) => (
              <span key={l.num} className="text-zinc-700 text-[10px] leading-6">
                {l.num}
              </span>
            ))}
          </div>
          {/* Code */}
          <div className="flex flex-col">
            {lines.map((l) => (
              <div key={l.num} className="leading-6 whitespace-pre">
                {l.tokens.map((tok, i) => (
                  <span key={i} className={tok.c}>
                    {tok.t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-green-500/8 border border-green-500/20 text-green-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Cookie-siz
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-blue-500/8 border border-blue-500/20 text-blue-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          GDPR
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-orange-500/8 border border-orange-500/20 text-orange-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
          2 qator
        </span>
      </div>
    </div>
  );
}

function AlertsVisual() {
  return (
    <div className="mt-4 space-y-2">
      {[
        {
          color: 'green',
          title: 'Traffic spike!',
          body: 'Saytingiz trafigi 2x oshdi — 847 tashrif/soat',
          time: 'hozir',
        },
        {
          color: 'yellow',
          title: 'Yangi manba',
          body: 'Twitter orqali 45 ta tashrif kelyapti',
          time: '5 min',
        },
        {
          color: 'red',
          title: 'Traffic drop',
          body: 'Telegram kanalida faollik 40% kamaydi',
          time: '1 soat',
        },
      ].map((a) => {
        const colors: Record<string, string> = {
          green: 'border-green-500/20  bg-green-500/5  text-green-400',
          yellow: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
          red: 'border-red-500/20    bg-red-500/5    text-red-400',
        };
        const dots: Record<string, string> = {
          green: 'bg-green-500',
          yellow: 'bg-yellow-500',
          red: 'bg-red-500',
        };
        return (
          <div
            key={a.title}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${colors[a.color]}`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dots[a.color]}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold truncate">{a.title}</p>
                <span className="text-[9px] text-zinc-700 shrink-0">
                  {a.time}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                {a.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CsvVisual() {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/60">
        <div className="flex gap-0 text-[9px] font-mono border-b border-zinc-800">
          {['date', 'path', 'views', 'device'].map((h) => (
            <div
              key={h}
              className="flex-1 px-2 py-1.5 text-zinc-500 border-r border-zinc-800 last:border-0 bg-zinc-800/30"
            >
              {h}
            </div>
          ))}
        </div>
        {[
          ['2025-06-22', '/blog', '342', 'desktop'],
          ['2025-06-22', '/pricing', '218', 'mobile'],
          ['2025-06-21', '/', '187', 'desktop'],
        ].map((row, i) => (
          <div
            key={i}
            className="flex gap-0 text-[9px] font-mono border-b border-zinc-800/40 last:border-0"
          >
            {row.map((cell, j) => (
              <div
                key={j}
                className="flex-1 px-2 py-1.5 text-zinc-500 border-r border-zinc-800/30 last:border-0 truncate"
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {['Excel', 'Google Sheets', 'CSV'].map((f) => (
          <span
            key={f}
            className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700/60 text-zinc-500"
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Bento config ────────────────────────────────── */
const bento = [
  {
    icon: Globe,
    label: 'Web analitika',
    title: 'Cookie-siz web analitika',
    desc: "Bitta `<script>` qatori qo'shing — tashrif, sahifalar, qurilmalar, manbalar real vaqtda ko'rinadi. GDPR-ga to'liq mos.",
    span: 'md:col-span-2 md:row-span-2',
    Visual: WebAnalyticsVisual,
    accent: 'orange',
  },
  {
    icon: Bot,
    label: 'AI',
    title: 'AI Haftalik hisobot',
    desc: 'Har dushanba emailingizga: nima yaxshi, nima yomon, keyingi hafta nima qilish kerak.',
    span: 'md:col-span-1',
    Visual: AiReportVisual,
    accent: 'orange',
  },
  {
    icon: Zap,
    label: 'Real vaqt',
    title: 'Jonli monitoring',
    desc: 'Hozir saytingizda nechta odam bor, qaysi sahifada — bir nazar bilan.',
    span: 'md:col-span-1',
    Visual: RealtimeVisual,
    accent: 'green',
  },
  {
    icon: Code2,
    label: 'Track.js',
    title: '2 qatorlik integratsiya',
    desc: "Murakkab sozlash yo'q. Script tag qo'shing — ishlaydi.",
    span: 'md:col-span-1',
    Visual: TrackingScriptVisual,
    accent: 'blue',
  },
  {
    icon: Bell,
    label: 'Alertlar',
    title: 'Aqlli bildirishnomalar',
    desc: "Traffic oshsa, tushsa, yangi manba paydo bo'lsa — darhol xabar olasiz.",
    span: 'md:col-span-1',
    Visual: AlertsVisual,
    accent: 'yellow',
  },
  {
    icon: Download,
    label: 'Eksport',
    title: 'CSV eksport',
    desc: "Barcha ma'lumotlarni Excel yoki Google Sheets ga bir tugma bilan eksport qiling.",
    span: 'md:col-span-1',
    Visual: CsvVisual,
    accent: 'zinc',
  },
];

const accentStyles: Record<
  string,
  { icon: string; border: string; label: string }
> = {
  orange: {
    icon: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    border: 'hover:border-orange-500/25',
    label: 'text-orange-500/70',
  },
  green: {
    icon: 'text-green-400  bg-green-500/10  border-green-500/20',
    border: 'hover:border-green-500/25',
    label: 'text-green-500/70',
  },
  blue: {
    icon: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
    border: 'hover:border-blue-500/25',
    label: 'text-blue-500/70',
  },
  yellow: {
    icon: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    border: 'hover:border-yellow-500/25',
    label: 'text-yellow-500/70',
  },
  zinc: {
    icon: 'text-zinc-400   bg-zinc-800      border-zinc-700',
    border: 'hover:border-zinc-600',
    label: 'text-zinc-500',
  },
};

/* ── Section ──────────────────────────────────────── */
export default function FeaturesSection() {
  return (
    <section id="imkoniyatlar" className="relative py-24 overflow-hidden">
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
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/6 blur-[120px]"
          style={{ animation: 'blob 14s ease-in-out infinite' }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div
          className="max-w-xl mb-12"
          style={{ animation: 'fade-up 0.6s ease-out both' }}
        >
          <p className="text-xs uppercase tracking-widest text-orange-500/80 font-medium mb-3">
            Imkoniyatlar
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-zinc-100">Hamma kerakli narsa</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              bitta platformada.
            </span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Murakkab sozlash yo&apos;q. Bir necha daqiqada ulang va barcha
            imkoniyatlardan foydalaning.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-auto">
          {bento.map((card, i) => {
            const a = accentStyles[card.accent];
            return (
              <div
                key={card.title}
                className={`group relative flex flex-col p-5 rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-900/90 transition-all duration-300 hover:shadow-xl ${card.span} ${a.border}`}
                style={{
                  animation: `fade-up 0.6s ease-out ${0.08 + i * 0.07}s both`,
                }}
              >
                {/* Hover shimmer */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className="h-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
                    style={{
                      animation: 'shimmer-slide 2.5s ease-in-out infinite',
                    }}
                  />
                </div>

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p
                      className={`text-[10px] uppercase tracking-widest font-medium mb-1.5 ${a.label}`}
                    >
                      {card.label}
                    </p>
                    <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
                      {card.title}
                    </h3>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${a.icon}`}
                  >
                    <card.icon className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed">
                  {card.desc}
                </p>

                {/* Visual */}
                <card.Visual />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
