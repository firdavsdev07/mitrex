import Link from "next/link";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Dot grid background */}
      <div
        className="fixed inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #52525b 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Orange glow top */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-orange-500/6 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 h-12 flex items-center px-6">
        <Link href="/" className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">Metrix</span>
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
