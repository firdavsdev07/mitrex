'use client';

import { Zap } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Imkoniyatlar', href: '#imkoniyatlar' },
  { label: 'Narxlar', href: '#narxlar' },
  { label: 'Haqida', href: '#haqida' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-12 flex items-center transition-all duration-200',
        scrolled
          ? 'border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 group">
          <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">
            Metrix
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5"
          >
            Kirish
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors px-3 py-1.5 rounded-md"
          >
            Bepul boshlash
          </Link>
        </div>
      </div>
    </header>
  );
}
