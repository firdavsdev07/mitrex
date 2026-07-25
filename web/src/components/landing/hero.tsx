import {
  ArrowRight,
  Check,
  Sparkles,
  TrendingUp,
  Bot,
  Users,
  Globe,
  Zap,
} from 'lucide-react';
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

const platformIcons = [
  { Icon: YouTubeIcon, label: 'YouTube' },
  { Icon: TelegramIcon, label: 'Telegram' },
  { Icon: InstagramIcon, label: 'Instagram' },
  { Icon: DiscordIcon, label: 'Discord' },
  { Icon: BlueskyIcon, label: 'Bluesky' },
  { Icon: WebIcon, label: 'Web' },
];

const heroStats = [
  { icon: Users, value: '500+', label: 'kreator' },
  { icon: Globe, value: '8', label: 'platforma' },
  { icon: Zap, value: 'Real', label: 'vaqt' },
];

const dashboardStats = [
  { label: 'Tashrif', value: '1,247', change: '+12%' },
  { label: 'Obunachi', value: '3,891', change: '+8%' },
  { label: "A'zo", value: '892', change: '+5%' },
  { label: "Ko'rish", value: '2,100', change: '+23%' },
];

const platforms = [
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
  {
    Icon: WebIcon,
    name: 'Sayt',
    stat: '1,247',
    sub: 'tashrif',
    change: '+312',
    points: '0,22 12,18 24,15 36,11 48,7 60,3',
  },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-12">
      {/* ── BACKGROUND ───────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #52525b 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Animated blob 1 — top right, big orange */}
        <div
          className="absolute -top-32 -right-32 w-[620px] h-[620px] bg-orange-500/12 blur-[90px]"
          style={{ animation: 'blob 10s ease-in-out infinite' }}
        />

        {/* Animated blob 2 — bottom left */}
        <div
          className="absolute -bottom-24 -left-24 w-[480px] h-[480px] bg-orange-600/8 blur-[80px]"
          style={{ animation: 'blob 10s ease-in-out 3s infinite' }}
        />

        {/* Animated blob 3 — center subtle */}
        <div
          className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-amber-500/6 blur-[100px]"
          style={{ animation: 'blob 10s ease-in-out 6s infinite' }}
        />

        {/* Vignette bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

        {/* Vignette sides */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent" />
      </div>

      {/* ── CONTENT ──────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center py-16 lg:py-24">
          {/* ── LEFT ─────────────────────────────────────── */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/25 bg-orange-500/8 text-orange-400 text-xs mb-7"
              style={{ animation: 'badge-pulse 3s ease-in-out infinite' }}
            >
              <Sparkles className="w-3 h-3" />
              <span className="font-medium">Beta versiyada</span>
              <span className="text-orange-600">·</span>
              <span>Bepul boshlash</span>
            </div>

            {/* Heading */}
            <h1
              className="text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold tracking-tight leading-[1.06] mb-5"
              style={{ animation: 'fade-up 0.6s ease-out 0.1s both' }}
            >
              <span className="text-zinc-50 block">Barcha raqamlar,</span>
              <span
                className="block text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, #fb923c 0%, #f97316 40%, #f59e0b 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'border-spin 4s ease-in-out infinite',
                }}
              >
                bitta joyda.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-[15px] text-zinc-400 leading-[1.75] mb-8 max-w-[440px]"
              style={{ animation: 'fade-up 0.6s ease-out 0.2s both' }}
            >
              YouTube, Telegram, Instagram va saytingiz — hammasi bitta
              minimalist dashboardda. Ertalab 1 daqiqada hamma narsa ko&apos;z
              oldingizda. AI raqamlarni oddiy tilda tushuntiradi.
            </p>

            {/* CTAs */}
            <div
              className="flex items-center gap-2.5 mb-6"
              style={{ animation: 'fade-up 0.6s ease-out 0.3s both' }}
            >
              {/* Primary CTA */}
              <Link
                href="/register"
                className="relative inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-md transition-all duration-200 overflow-hidden group"
                style={{ animation: 'glow-pulse 2.5s ease-in-out infinite' }}
              >
                {/* Shimmer effect */}
                <span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  style={{
                    animation: 'shimmer-slide 2.5s ease-in-out infinite',
                  }}
                />
                <span className="relative">Bepul boshlash</span>
                <ArrowRight className="relative w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Secondary CTA */}
              <Link
                href="#demo"
                className="inline-flex items-center gap-1.5 border border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm px-5 py-2.5 rounded-md transition-all duration-200"
              >
                Demoni ko&apos;rish
              </Link>
            </div>

            {/* Trust checks */}
            <div
              className="flex items-center gap-5 mb-10"
              style={{ animation: 'fade-up 0.6s ease-out 0.4s both' }}
            >
              {['Bepul plan bor', 'Karta kerak emas', '2 daqiqada'].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1.5 text-xs text-zinc-600"
                >
                  <Check className="w-3 h-3 text-zinc-700" />
                  {t}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div
              className="border-t border-zinc-800/60 pt-8"
              style={{ animation: 'fade-up 0.6s ease-out 0.5s both' }}
            >
              {/* Mini social proof stats */}
              <div className="flex items-center gap-6 mb-6">
                {heroStats.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-sm font-semibold text-zinc-200">
                      {value}
                    </span>
                    <span className="text-xs text-zinc-600">{label}</span>
                  </div>
                ))}
              </div>

              {/* Platform icons */}
              <div>
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-2.5">
                  Qo&apos;llab-quvvatlanadigan platformalar
                </p>
                <div className="flex items-center gap-1.5">
                  {platformIcons.map(({ Icon, label }) => (
                    <div
                      key={label}
                      title={label}
                      className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-200 cursor-default"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  ))}
                  <span className="text-[10px] text-zinc-700 ml-1">+4 ta</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Dashboard Mockup ──────────────────── */}
          <div className="hidden lg:block relative">
            {/* Floating card — top left */}
            <div
              className="absolute -top-4 -left-10 z-30 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-3 shadow-2xl shadow-black/50 min-w-[148px]"
              style={{ animation: 'float 4s ease-in-out infinite' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-100">
                    +23% o&apos;sish
                  </p>
                  <p className="text-[10px] text-zinc-500">bu hafta</p>
                </div>
              </div>
            </div>

            {/* Floating card — bottom right */}
            <div
              className="absolute -bottom-4 -right-6 z-30 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-3 shadow-2xl shadow-black/50 max-w-[180px]"
              style={{ animation: 'float 4s ease-in-out 1.5s infinite' }}
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3 h-3 text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-zinc-200">
                    AI tahlil tayyor
                  </p>
                  <p className="text-[10px] text-zinc-600 leading-relaxed mt-0.5">
                    Telegram bu hafta +8% o&apos;sdi
                  </p>
                </div>
              </div>
            </div>

            {/* Floating stat — right */}
            <div
              className="absolute top-1/3 -right-10 z-30 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-3 shadow-2xl shadow-black/50"
              style={{ animation: 'float 5s ease-in-out 0.8s infinite' }}
            >
              <div className="flex items-center gap-2.5">
                <TelegramIcon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-100">892</p>
                  <p className="text-[10px] text-zinc-500">a&apos;zo</p>
                </div>
              </div>
            </div>

            {/* Main card */}
            <div
              className="relative rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
              style={{
                transform:
                  'perspective(1100px) rotateX(4deg) rotateY(-7deg) rotateZ(0.5deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Animated gradient border */}
              <div
                className="absolute inset-0 rounded-2xl p-px"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(249,115,22,0.4) 0%, rgba(249,115,22,0.05) 40%, rgba(249,115,22,0.2) 100%)',
                  backgroundSize: '200% 200%',
                  animation: 'border-spin 4s linear infinite',
                }}
              >
                <div className="absolute inset-px rounded-2xl bg-zinc-950" />
              </div>

              {/* Top shimmer line */}
              <div className="absolute top-0 left-0 right-0 h-px z-10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-transparent via-orange-400/60 to-transparent"
                  style={{ animation: 'shimmer-slide 3s ease-in-out infinite' }}
                />
              </div>

              {/* Window chrome */}
              <div className="relative flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/80">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-0.5 rounded-md bg-zinc-800/50 text-zinc-600 text-[11px]">
                    app.metrix.io/dashboard
                  </div>
                </div>
              </div>

              {/* Body */}
              <div
                className="relative bg-zinc-950/98 flex"
                style={{ minHeight: 300 }}
              >
                {/* Sidebar */}
                <div className="w-36 border-r border-zinc-800/50 p-2 shrink-0 bg-zinc-900/30">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-sm bg-orange-500" />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300">
                      Metrix
                    </span>
                  </div>
                  {[
                    'Dashboard',
                    'Saytlar',
                    'Platformalar',
                    'Postlar',
                    'AI Insights',
                    'Alertlar',
                  ].map((item, i) => (
                    <div
                      key={item}
                      className={`px-2 py-1.5 rounded-md text-[10px] mb-0.5 transition-colors ${
                        i === 0
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/15'
                          : 'text-zinc-600'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-3 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
                        Umumiy ko&apos;rinish
                      </p>
                      <p className="text-xs font-semibold text-zinc-200 mt-0.5">
                        Xush kelibsiz, Firdavs
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {['Bugun', 'Hafta', 'Oy'].map((t, i) => (
                        <span
                          key={t}
                          className={`text-[9px] px-2 py-0.5 rounded-md transition-colors ${
                            i === 1
                              ? 'bg-orange-500/12 text-orange-400 border border-orange-500/20'
                              : 'text-zinc-700'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {dashboardStats.map((s) => (
                      <div
                        key={s.label}
                        className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/50"
                      >
                        <p className="text-[8px] text-zinc-600 mb-0.5 uppercase tracking-wider">
                          {s.label}
                        </p>
                        <p className="text-[11px] font-bold text-zinc-100 tabular-nums">
                          {s.value}
                        </p>
                        <p className="text-[8px] text-green-400 mt-0.5 font-medium">
                          {s.change}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Platform list */}
                  <div className="rounded-lg border border-zinc-800/50 overflow-hidden mb-2">
                    {platforms.map((p, i) => (
                      <div
                        key={p.name}
                        className={`flex items-center gap-2 px-2.5 py-2 hover:bg-zinc-900/40 transition-colors ${
                          i < platforms.length - 1
                            ? 'border-b border-zinc-800/30'
                            : ''
                        }`}
                      >
                        <p.Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] text-zinc-400 w-14 shrink-0">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-200 flex-1 tabular-nums">
                          {p.stat}{' '}
                          <span className="text-zinc-600 font-normal text-[9px]">
                            {p.sub}
                          </span>
                        </span>
                        <Sparkline points={p.points} />
                        <span className="text-[10px] text-green-400 font-medium w-8 text-right tabular-nums">
                          {p.change}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AI insight */}
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-orange-500/12 bg-orange-500/5">
                    <div className="w-4 h-4 rounded-md bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-2.5 h-2.5 text-orange-400" />
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      <span className="text-orange-400 font-medium">AI: </span>
                      Instagram kanalingiz 23% o&apos;sdi. Rasm postlar 2x ko&apos;proq
                      reach oldi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
