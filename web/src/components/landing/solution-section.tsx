"use client";

import { Bot, Zap, Bell, Users, RefreshCw, ArrowUpRight, Crown, ShieldCheck, Eye, Lock, Mail, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import {
  YouTubeIcon, TelegramIcon, InstagramIcon,
  DiscordIcon, BlueskyIcon, WebIcon, Sparkline,
} from "@/components/icons/platform-icons";

/* ── Chart data ──────────────────────────────────── */
const chartBars = [
  { h: 38, label: "Du" },
  { h: 52, label: "Se" },
  { h: 44, label: "Ch" },
  { h: 70, label: "Pa" },
  { h: 58, label: "Ju" },
  { h: 82, label: "Sh" },
  { h: 75, label: "Ya" },
];

const platforms = [
  { Icon: YouTubeIcon,  name: "YouTube",   stat: "3,891", change: "+145", points: "0,20 12,16 24,13 36,9 48,5 60,2" },
  { Icon: TelegramIcon, name: "Telegram",  stat: "892",   change: "+67",  points: "0,18 12,15 24,12 36,9 48,7 60,4" },
  { Icon: InstagramIcon,name: "Instagram", stat: "2,100", change: "+203", points: "0,20 12,16 24,11 36,13 48,7 60,3" },
  { Icon: WebIcon,      name: "Sayt",      stat: "1,247", change: "+312", points: "0,22 12,17 24,14 36,10 48,6 60,2" },
];

const topStats = [
  { label: "Jami tashrif",  value: "1,247", change: "+12%", up: true },
  { label: "Jami obunachi", value: "7,783", change: "+8%",  up: true },
  { label: "Jami a'zolar",  value: "892",   change: "+5%",  up: true },
  { label: "Ko'rishlar",    value: "2,100", change: "+23%", up: true },
];

/* ── Main Dashboard Mockup ───────────────────────── */
function DashboardMockup() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-zinc-800/70 shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
      style={{ transform: "perspective(1400px) rotateX(3deg)" }}
    >
      {/* Animated gradient border top */}
      <div
        className="absolute top-0 left-0 right-0 h-px z-10"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.5), rgba(251,191,36,0.3), transparent)",
          backgroundSize: "200% 100%",
          animation: "border-spin 3s linear infinite",
        }}
      />

      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800/60">
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="flex-1 flex justify-center">
          <span className="px-4 py-0.5 rounded-md bg-zinc-800/60 text-zinc-600 text-[11px]">
            app.metrix.io/dashboard
          </span>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
              style={{ animation: "ping-slow 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </span>
          <span className="text-[10px] text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-zinc-950 flex" style={{ minHeight: 340 }}>

        {/* Sidebar */}
        <div className="w-40 border-r border-zinc-800/50 p-2.5 shrink-0 bg-zinc-900/20">
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
            </div>
            <span className="text-xs font-bold text-zinc-200 tracking-tight">Metrix</span>
          </div>
          {[
            ["Dashboard", true],
            ["Saytlar", false],
            ["Platformalar", false],
            ["Postlar", false],
            ["AI Insights", false],
            ["Alertlar", false],
            ["Workspace", false],
          ].map(([label, active]) => (
            <div key={label as string}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] mb-0.5 transition-colors ${
                active
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/15 font-medium"
                  : "text-zinc-600"
              }`}
            >
              {label as string}
              {label === "Workspace" && (
                <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
                  NEW
                </span>
              )}
            </div>
          ))}

          {/* Team avatars at bottom of sidebar */}
          <div className="absolute bottom-3 left-2.5 right-2.5">
            <div className="border-t border-zinc-800/40 pt-2">
              <p className="text-[9px] text-zinc-700 mb-1.5 px-1 uppercase tracking-wider">Jamoa</p>
              <div className="flex -space-x-1.5 px-1">
                {["F","A","S"].map((l, i) => (
                  <div key={i}
                    className="w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center text-[8px] font-bold"
                    style={{ background: ["#f97316","#3b82f6","#22c55e"][i] + "30", color: ["#f97316","#60a5fa","#4ade80"][i] }}
                  >
                    {l}
                  </div>
                ))}
                <div className="w-5 h-5 rounded-full border border-zinc-800 bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-500">
                  +2
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 p-4 min-w-0 flex flex-col gap-3">

          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Umumiy ko'rinish</p>
              <p className="text-sm font-bold text-zinc-100 mt-0.5">Bu hafta</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["Bugun","Hafta","Oy"].map((t, i) => (
                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md ${
                    i === 1 ? "bg-orange-500/12 text-orange-400 border border-orange-500/20" : "text-zinc-700"
                  }`}>{t}</span>
                ))}
              </div>
              <div className="w-6 h-6 rounded-md bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center">
                <RefreshCw className="w-3 h-3 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-2">
            {topStats.map((s, i) => (
              <div key={s.label}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/50"
                style={{ animation: `fade-up 0.5s ease-out ${0.1 + i * 0.08}s both` }}
              >
                <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-sm font-bold text-zinc-100 tabular-nums">{s.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-2.5 h-2.5 text-green-400" />
                  <p className="text-[9px] text-green-400 font-semibold">{s.change}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + platform list */}
          <div className="grid grid-cols-2 gap-2 flex-1">

            {/* Bar chart */}
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-medium text-zinc-400">Haftalik tashrif</p>
                <span className="text-[9px] text-green-400 font-medium">↑ 23%</span>
              </div>
              <div className="flex items-end gap-1 h-16 mb-1">
                {chartBars.map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${b.h}%`,
                        background: i === 5
                          ? "linear-gradient(to top, #f97316, #fb923c)"
                          : "rgba(249,115,22,0.2)",
                        animation: `bar-rise 0.6s ease-out ${0.05 + i * 0.07}s both`,
                        transformOrigin: "bottom",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {chartBars.map((b) => (
                  <span key={b.label} className="flex-1 text-center text-[8px] text-zinc-700">{b.label}</span>
                ))}
              </div>
            </div>

            {/* Platform list */}
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800/40">
                <p className="text-[10px] font-medium text-zinc-400">Platformalar</p>
              </div>
              {platforms.map((p, i) => (
                <div key={p.name}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/20 transition-colors ${
                    i < platforms.length - 1 ? "border-b border-zinc-800/30" : ""
                  }`}
                >
                  <p.Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] text-zinc-400 w-12 shrink-0">{p.name}</span>
                  <span className="text-[10px] font-bold text-zinc-200 flex-1 tabular-nums">{p.stat}</span>
                  <Sparkline points={p.points} />
                  <span className="text-[10px] text-green-400 font-medium w-8 text-right">{p.change}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI insight */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-orange-500/15 bg-orange-500/5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-orange-400 mb-0.5">AI haftalik tahlil</p>
              <p className="text-[10px] text-zinc-400 leading-relaxed truncate">
                Bu hafta Instagram kanalingiz 23% o'sdi. Shanba kuni eng yuqori ko'rsatkichga erishildi. Keyingi haftaga maslahat: rasm formatida 3 ta post.
              </p>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Feature cards ───────────────────────────────── */
const features = [
  {
    icon: Zap,
    title: "1 daqiqa ertalab",
    desc: "Kofengizni ichib, Metrixni ochib — hamma narsa ko'z oldingizda.",
    visual: (
      <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
        <div className="text-2xl font-black text-orange-500 tabular-nums">1</div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-300">daqiqa</p>
          <p className="text-[9px] text-zinc-600">har kuni ertasi</p>
        </div>
        <div className="ml-auto">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 flex items-center justify-center">
            <div className="w-3 h-3 border-t-2 border-r-2 border-orange-500 rounded-sm" style={{ transform: "rotate(45deg) translate(-1px,1px)" }} />
          </div>
        </div>
      </div>
    ),
    color: "hover:border-orange-500/20",
  },
  {
    icon: Bot,
    title: "AI tushuntiradi",
    desc: "Raqamlar nima demoqda? AI oddiy tilda tushuntiradi, maslahat beradi.",
    visual: (
      <div className="mt-3 p-2.5 rounded-lg border border-orange-500/10 bg-orange-500/5 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Bot className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-zinc-400 leading-relaxed">
            YouTube kanalingiz bu hafta 8% o'sdi. Asosiy sabab — Chorshanba kuni yuklangan video.
          </p>
        </div>
        <div className="h-px bg-orange-500/10" />
        <p className="text-[9px] text-orange-400/70 font-medium">Tavsiya: yana 1 ta qisqa video yozing</p>
      </div>
    ),
    color: "hover:border-orange-500/20",
  },
  {
    icon: Bell,
    title: "Aqlli alertlar",
    desc: "Traffic 2x oshsa yoki tushsa — darhol bildirishnoma olasiz.",
    visual: (
      <div className="mt-3 space-y-1.5">
        {[
          { t: "Traffic spike!", d: "Sayt trafigi 2x oshdi", c: "border-green-500/20 bg-green-500/5 text-green-400" },
          { t: "Yangi manbadan", d: "Twitter orqali 45 ta tashrif", c: "border-blue-500/20 bg-blue-500/5 text-blue-400" },
        ].map((a) => (
          <div key={a.t} className={`flex items-start gap-2 p-2 rounded-lg border ${a.c}`}>
            <Bell className="w-2.5 h-2.5 mt-0.5 shrink-0" />
            <div>
              <p className={`text-[9px] font-semibold`}>{a.t}</p>
              <p className="text-[9px] text-zinc-600">{a.d}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    color: "hover:border-green-500/20",
  },
];

/* ── Workspace section ───────────────────────────── */
const team = [
  { initial: "F", color: "#f97316", bg: "#f9731618", name: "Firdavs N.", role: "Owner",  online: true,  Icon: Crown        },
  { initial: "A", color: "#3b82f6", bg: "#3b82f618", name: "Aziz K.",    role: "Admin",  online: true,  Icon: ShieldCheck  },
  { initial: "S", color: "#22c55e", bg: "#22c55e18", name: "Shirin M.",  role: "Editor", online: false, Icon: null         },
  { initial: "D", color: "#a855f7", bg: "#a855f718", name: "Dilnoza T.", role: "Viewer", online: false, Icon: Eye          },
];

const roleColors: Record<string, string> = {
  Owner:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
  Admin:  "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Editor: "text-green-400  bg-green-500/10  border-green-500/20",
  Viewer: "text-zinc-400   bg-zinc-500/10   border-zinc-500/20",
};

function WorkspaceCard() {
  return (
    <div
      className="relative rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
      style={{ animation: "fade-up 0.6s ease-out 0.4s both" }}
    >
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* ── Left: text ─────────────────────────────── */}
        <div className="p-8 border-b md:border-b-0 md:border-r border-zinc-800">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
            <Users className="w-5 h-5 text-orange-400" />
          </div>

          {/* Heading */}
          <h3 className="text-2xl font-bold tracking-tight mb-3 leading-tight">
            <span className="text-zinc-100">Jamoa bilan</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
              birgalikda ishlang
            </span>
          </h3>

          {/* Description */}
          <p className="text-sm text-zinc-400 leading-relaxed mb-8">
            Workspace yarating, jamoa a'zolarini taklif qiling. Har bir
            a'zoga alohida ruxsat darajasi bering — Owner, Admin, Editor
            yoki Viewer.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mb-8">
            {[
              { Icon: LayoutDashboard, text: "Umumiy dashboard — hamma bir joyda ko'radi" },
              { Icon: Lock,            text: "Alohida ruxsatlar — kim nima ko'ra olishini belgilang" },
              { Icon: Mail,            text: "Invite link — email orqali taklif qiling" },
            ].map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <f.Icon className="w-3.5 h-3.5 text-zinc-400" />
                </span>
                <span className="text-sm text-zinc-400">{f.text}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-200 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
          >
            Workspace yaratish
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Right: visual ──────────────────────────── */}
        <div className="p-8 bg-zinc-950/50">

          {/* Workspace header card */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 mb-4">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-orange-400">M</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">Metrix Workspace</p>
              <p className="text-xs text-zinc-500 mt-0.5">4 a'zo · 3 sayt · 8 platforma</p>
            </div>
            <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border border-green-500/25 bg-green-500/10 text-green-400">
              Faol
            </span>
          </div>

          {/* Team members */}
          <div className="space-y-2 mb-3">
            {team.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}30` }}
                  >
                    {m.initial}
                  </div>
                  {m.online ? (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-950" />
                  ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-zinc-700 border-2 border-zinc-950" />
                  )}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{m.name}</p>
                  <p className={`text-[10px] mt-0.5 ${m.online ? "text-green-500" : "text-zinc-600"}`}>
                    {m.online ? "● Online" : "○ Offline"}
                  </p>
                </div>

                {/* Role badge */}
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${roleColors[m.role]}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>

          {/* Invite row */}
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-orange-500/40 hover:bg-orange-500/5 text-xs text-zinc-600 hover:text-orange-400 transition-all duration-200">
            <span className="text-base leading-none">+</span>
            A'zo taklif qilish
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────── */
export default function SolutionSection() {
  return (
    <section className="relative py-24 overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: "radial-gradient(circle, #52525b 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute -top-40 right-0 w-[700px] h-[600px] bg-orange-500/8 blur-[120px]"
          style={{ animation: "blob 12s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/6 blur-[100px]"
          style={{ animation: "blob 12s ease-in-out 4s infinite" }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">

        {/* Heading */}
        <div className="max-w-lg mb-12" style={{ animation: "fade-up 0.6s ease-out both" }}>
          <p className="text-xs uppercase tracking-widest text-orange-500/80 font-medium mb-3">
            Yechim
          </p>
          <h2 className="text-4xl font-bold tracking-tight leading-[1.1] mb-4">
            <span className="text-zinc-100">Hammasi bitta joyda.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
              Chiroyli. Tez. Aqlli.
            </span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Bitta login, bitta dashboard. Barcha platformalaringiz real vaqtda
            sinxronlashadi. AI haftalik hisobotlar yuboradi. Jamoa bilan birga ishlaysiz.
          </p>
        </div>

        {/* Main dashboard mockup */}
        <div style={{ animation: "fade-up 0.6s ease-out 0.15s both" }} className="mb-8">
          <DashboardMockup />
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all duration-300 ${f.color} hover:shadow-lg`}
              style={{ animation: `fade-up 0.6s ease-out ${0.25 + i * 0.1}s both` }}
            >
              {/* Hover shimmer */}
              <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-full bg-gradient-to-r from-transparent via-orange-400/40 to-transparent"
                  style={{ animation: "shimmer-slide 2s ease-in-out infinite" }} />
              </div>

              <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4">
                <f.icon className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-1.5">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              {f.visual}
            </div>
          ))}
        </div>

        {/* Workspace card */}
        <WorkspaceCard />
      </div>
    </section>
  );
}
