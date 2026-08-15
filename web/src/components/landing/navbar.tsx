import { Zap } from 'lucide-react';
import Link from 'next/link';

const navLinks = [
  { label: 'Imkoniyatlar', href: '#imkoniyatlar' },
  { label: 'Narxlar', href: '#narxlar' },
  { label: 'Haqida', href: '#haqida' },
];

// Ilgari bu yerda skroll holatiga qarab fon qo'yiladigan `useEffect` bor edi
// va u ishlamas edi (`reactCompiler: true` bilan holat hech qachon
// yangilanmagan) — natijada navbar doim shaffof qolib, ostidagi matn
// ustiga chiqib ketardi. Qorong'i mavzuda bu sezilmagan.
//
// Endi umuman JS holati yo'q: navbar — doim quyma, suzuvchi panel.
// Bu ham ishonchliroq, ham kerakli ko'rinish: panel kontent ustida
// aniq qatlam bo'lib turadi.
export default function Navbar() {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4">
      <div className="mx-auto flex h-14 w-full max-w-landing items-center justify-between rounded-panel border border-line-subtle bg-surface px-5 shadow-card">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 group">
          <div className="w-6 h-6 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-accent-ink" />
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">
            Metrix
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-2 hover:text-ink transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-ink-2 hover:text-ink transition-colors px-3 py-1.5"
          >
            Kirish
          </Link>
          <Link
            href="/register"
            className="flex h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent shadow-card transition-all hover:bg-accent-hover active:translate-y-px"
          >
            Bepul boshlash
          </Link>
        </div>
      </div>
    </header>
  );
}
