import { ArrowRight, Check, Users, Globe, Zap } from "lucide-react";
import Link from "next/link";
import {
  YouTubeIcon, TelegramIcon, InstagramIcon,
  DiscordIcon, BlueskyIcon, FacebookIcon, ThreadsIcon, WebIcon,
} from "@/components/icons/platform-icons";

const stats = [
  { icon: Users, value: "500+", label: "kreator"          },
  { icon: Globe, value: "8",    label: "platforma"         },
  { icon: Zap,   value: "$0",   label: "boshlash uchun"   },
];

const platformIcons = [
  { Icon: YouTubeIcon,   label: "YouTube"   },
  { Icon: TelegramIcon,  label: "Telegram"  },
  { Icon: InstagramIcon, label: "Instagram" },
  { Icon: DiscordIcon,   label: "Discord"   },
  { Icon: BlueskyIcon,   label: "Bluesky"   },
  { Icon: FacebookIcon,  label: "Facebook"  },
  { Icon: ThreadsIcon,   label: "Threads"   },
  { Icon: WebIcon,       label: "Web sayt"  },
];

const trustItems = [
  "Kredit karta kerak emas",
  "2 daqiqada sozlanadi",
  "Istalgan vaqt bekor qilish",
];

export default function CtaSection() {
  return (
    <section className="relative py-24 overflow-hidden">

      {/* Section bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle, #52525b 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">

        {/* Main card */}
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900">

          {/* Dot grid inside card — solid, no transparency issue */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              opacity: 0.3,
            }}
          />

          {/* Orange glow — top center */}
          <div
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-[280px] rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(249,115,22,0.2) 0%, transparent 70%)",
              animation: "blob 12s ease-in-out infinite",
            }}
          />

          {/* Shimmer top border */}
          <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-transparent via-orange-400/70 to-transparent"
              style={{ animation: "shimmer-slide 3s ease-in-out infinite" }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 flex flex-col items-center text-center">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium mb-8"
              style={{ animation: "badge-pulse 3s ease-in-out infinite" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Bugun boshlang — bepul
            </div>

            {/* Heading */}
            <h2
              className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6"
              style={{ animation: "fade-up 0.6s ease-out 0.1s both" }}
            >
              <span className="block text-zinc-50">Barcha analitikangiz</span>
              <span
                className="block text-transparent bg-clip-text"
                style={{
                  backgroundImage: "linear-gradient(135deg, #fb923c 0%, #f97316 40%, #f59e0b 100%)",
                  backgroundSize: "200% 200%",
                  animation: "border-spin 4s ease-in-out infinite",
                }}
              >
                bitta joyda.
              </span>
            </h2>

            {/* Subtitle */}
            <p
              className="text-base text-zinc-400 max-w-md leading-relaxed mb-10"
              style={{ animation: "fade-up 0.6s ease-out 0.2s both" }}
            >
              2 daqiqada ro'yxatdan o'ting, birinchi platformangizni ulang.
              Hech qanday murakkablik yo'q.
            </p>

            {/* Stats */}
            <div
              className="flex items-center gap-10 mb-10"
              style={{ animation: "fade-up 0.6s ease-out 0.25s both" }}
            >
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-2xl font-black text-zinc-100 tabular-nums">{s.value}</span>
                  </div>
                  <span className="text-[11px] text-zinc-600">{s.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-center gap-3 mb-6"
              style={{ animation: "fade-up 0.6s ease-out 0.3s both" }}
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-8 py-3 rounded-xl transition-colors duration-200 shadow-lg shadow-orange-500/20"
              >
                Bepul boshlash
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="#demo"
                className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 text-sm font-medium px-8 py-3 rounded-xl transition-colors duration-200"
              >
                Demo ko'rish
              </Link>
            </div>

            {/* Trust */}
            <div
              className="flex flex-wrap items-center justify-center gap-5 mb-12"
              style={{ animation: "fade-up 0.6s ease-out 0.35s both" }}
            >
              {trustItems.map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <Check className="w-3 h-3 text-zinc-700" />
                  {t}
                </span>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full border-t border-zinc-800 mb-10" />

            {/* Platforms */}
            <div style={{ animation: "fade-up 0.6s ease-out 0.4s both" }}>
              <p className="text-[11px] text-zinc-700 uppercase tracking-widest mb-4">
                Barcha platformalar bilan ishlaydi
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {platformIcons.map(({ Icon, label }) => (
                  <div
                    key={label}
                    title={label}
                    className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 hover:bg-zinc-700 transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
