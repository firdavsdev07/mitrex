import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <div
        className="fixed inset-0 opacity-[0.12] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #52525b 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <header className="relative z-10 h-12 flex items-center px-6 border-b border-line-subtle">
        <Link href="/" className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-accent-ink" />
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">
            Metrix
          </span>
        </Link>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Bosh sahifaga
        </Link>

        <h1 className="text-2xl font-semibold text-ink mb-1">{title}</h1>
        <p className="text-sm text-ink-3 mb-10">
          Oxirgi yangilanish: {updated}
        </p>

        <div className="prose-legal flex flex-col gap-8 text-sm leading-relaxed text-ink-2">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink mb-2.5">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
