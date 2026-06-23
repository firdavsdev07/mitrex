"use client";

import { Clock, BrainCircuit, Unlink, AlertCircle } from "lucide-react";
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  WebIcon,
} from "@/components/icons/platform-icons";

/* ── Visual: Browser tabs ─────────────────────────── */
const tabs = [
  { Icon: WebIcon,       label: "Google Analytics", url: "analytics.google.com", color: "bg-blue-500/20 border-blue-500/30",  dot: "bg-blue-400"    },
  { Icon: YouTubeIcon,   label: "YouTube Studio",   url: "studio.youtube.com",   color: "bg-red-500/20 border-red-500/30",    dot: "bg-red-400"     },
  { Icon: TelegramIcon,  label: "Telegram",         url: "web.telegram.org",     color: "bg-sky-500/20 border-sky-500/30",    dot: "bg-sky-400"     },
  { Icon: InstagramIcon, label: "Instagram",        url: "instagram.com",        color: "bg-pink-500/20 border-pink-500/30",  dot: "bg-pink-400"    },
  { Icon: DiscordIcon,   label: "Discord",          url: "discord.com/channels", color: "bg-indigo-500/20 border-indigo-500/30", dot: "bg-indigo-400" },
];

function TabsVisual() {
  return (
    <div className="space-y-1.5 mb-4">
      {tabs.map((t, i) => (
        <div
          key={t.label}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${t.color} transition-all`}
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <t.Icon className="w-3.5 h-3.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-zinc-300 truncate">{t.label}</p>
            <p className="text-[9px] text-zinc-600 truncate">{t.url}</p>
          </div>
          <div className={`w-1.5 h-1.5 rounded-full ${t.dot} opacity-70`} />
        </div>
      ))}

      {/* Time cost badge */}
      <div className="flex items-center justify-center gap-1.5 mt-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5">
        <Clock className="w-3 h-3 text-red-400" />
        <span className="text-[11px] font-semibold text-red-400">30 daqiqa / kun</span>
        <span className="text-[10px] text-zinc-600">= 180 soat/yil</span>
      </div>
    </div>
  );
}

/* ── Visual: Cluttered dashboard ──────────────────── */
function ChaosVisual() {
  const bars = [
    { h: 55, w: "col-span-2" },
    { h: 35, w: "col-span-1" },
    { h: 28, w: "col-span-1" },
    { h: 28, w: "col-span-1" },
    { h: 44, w: "col-span-1" },
    { h: 44, w: "col-span-1" },
    { h: 20, w: "col-span-2" },
    { h: 20, w: "col-span-1" },
  ];

  return (
    <div className="mb-4">
      {/* Messy chart mockup */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`rounded-md bg-zinc-800/70 border border-zinc-700/30 ${b.w}`}
            style={{ height: b.h }}
          />
        ))}
      </div>

      {/* Confusion indicators */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          "Sessions vs Visits?",
          "Bounce rate nima?",
          "CTR vs CPC?",
          "DAU/MAU nima?",
        ].map((q) => (
          <div
            key={q}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-zinc-800/40 border border-zinc-700/20"
          >
            <AlertCircle className="w-3 h-3 text-yellow-500/70 shrink-0" />
            <span className="text-[9px] text-zinc-500 truncate">{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Visual: Disconnected islands ─────────────────── */
const islands = [
  { Icon: YouTubeIcon,   label: "YouTube",  color: "border-red-500/20   bg-red-500/5"   },
  { Icon: TelegramIcon,  label: "Telegram", color: "border-sky-500/20   bg-sky-500/5"   },
  { Icon: InstagramIcon, label: "Instagram",color: "border-pink-500/20  bg-pink-500/5"  },
  { Icon: DiscordIcon,   label: "Discord",  color: "border-indigo-500/20 bg-indigo-500/5"},
  { Icon: BlueskyIcon,   label: "Bluesky",  color: "border-blue-500/20  bg-blue-500/5"  },
  { Icon: WebIcon,       label: "Sayt",     color: "border-zinc-500/20  bg-zinc-500/5"  },
];

function IslandsVisual() {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {islands.map((p) => (
          <div
            key={p.label}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${p.color}`}
          >
            <p.Icon className="w-5 h-5" />
            <span className="text-[9px] text-zinc-500">{p.label}</span>
            {/* Mini random bar */}
            <div className="w-full h-1 rounded-full bg-zinc-800">
              <div
                className="h-1 rounded-full bg-zinc-600"
                style={{ width: `${30 + Math.floor(p.label.length * 7) % 55}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* "No connection" status */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-zinc-700/30 bg-zinc-800/20">
        <Unlink className="w-3 h-3 text-zinc-600" />
        <span className="text-[10px] text-zinc-600">Platformalar bir-biriga ulanmagan</span>
      </div>
    </div>
  );
}

/* ── Cards config ─────────────────────────────────── */
const problems = [
  {
    icon: Clock,
    number: "01",
    title: "Vaqt ketadi",
    description:
      "Google Analytics, YouTube Studio, Telegram, Instagram — har birida alohida login, alohida grafik. Kuniga 30 daqiqa faqat raqam yig'ishga ketadi.",
    Visual: TabsVisual,
    accentColor: "text-red-400",
    borderGlow: "hover:border-red-500/20 hover:shadow-red-500/5",
    labelColor: "text-red-400/60",
  },
  {
    icon: BrainCircuit,
    number: "02",
    title: "Murakkab interfeys",
    description:
      "Google Analytics o'rganish uchun kurs kerak. Boshqalari ham undan kam emas. Siz biznesingiz bilan shug'ullanishingiz kerak, analytics bilan emas.",
    Visual: ChaosVisual,
    accentColor: "text-yellow-400",
    borderGlow: "hover:border-yellow-500/20 hover:shadow-yellow-500/5",
    labelColor: "text-yellow-400/60",
  },
  {
    icon: Unlink,
    number: "03",
    title: "Umumiy rasm yo'q",
    description:
      "Saytingiz va sotsial tarmoqlaringiz o'rtasidagi bog'liqlikni ko'rishning hech qanday oddiy usuli yo'q. Hamma narsa alohida, hech narsa birlashmagan.",
    Visual: IslandsVisual,
    accentColor: "text-zinc-400",
    borderGlow: "hover:border-zinc-500/20 hover:shadow-zinc-500/5",
    labelColor: "text-zinc-500/60",
  },
];

/* ── Section ──────────────────────────────────────── */
export default function ProblemSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #52525b 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Heading */}
        <div className="max-w-xl mb-14" style={{ animation: "fade-up 0.6s ease-out both" }}>
          <p className="text-xs uppercase tracking-widest text-orange-500/80 font-medium mb-3">
            Muammo
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-zinc-100 leading-[1.1] mb-4">
            Har kuni sabah
            <br />
            <span className="text-zinc-500">5 ta login,</span>
            <br />
            <span className="text-zinc-600">5 ta parol...</span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Ko'pchilik solopreneurlar va kreatorlar har kuni bir xil muammo bilan
            kurashadi. Vaqt, chalkashlik va yagona ko'rinishning yo'qligi.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className={`group relative flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-300 hover:bg-zinc-900/70 hover:shadow-lg ${p.borderGlow}`}
              style={{ animation: `fade-up 0.6s ease-out ${0.1 + i * 0.1}s both` }}
            >
              {/* Shimmer top border on hover */}
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div
                  className="h-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"
                  style={{ animation: "shimmer-slide 2s ease-in-out infinite" }}
                />
              </div>

              {/* Number badge */}
              <div className="flex items-center justify-between mb-5">
                <span className={`text-xs font-mono font-bold ${p.labelColor} tracking-widest`}>
                  {p.number}
                </span>
                <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                  <p.icon className={`w-3.5 h-3.5 ${p.accentColor}`} />
                </div>
              </div>

              {/* Visual illustration */}
              <p.Visual />

              {/* Text */}
              <div className="mt-auto">
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom connector to solution */}
        <div className="flex flex-col items-center mt-14 gap-2">
          <div className="w-px h-12 bg-gradient-to-b from-zinc-700 to-transparent" />
          <p className="text-xs text-zinc-600">
            Metrix bularning barchasini hal qiladi
          </p>
        </div>
      </div>
    </section>
  );
}
