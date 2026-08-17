import { Zap } from 'lucide-react';
import Link from 'next/link';

const links = {
  Mahsulot: [
    { label: 'Imkoniyatlar', href: '#imkoniyatlar' },
    { label: 'Narxlar', href: '#narxlar' },
    { label: 'Integratsiyalar', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Kompaniya: [
    { label: 'Haqida', href: '#haqida' },
    { label: 'Blog', href: '#' },
    { label: "Ish o'rinlari", href: '#' },
  ],
  "Qo'llab-quvvatlash": [
    { label: 'Docs', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'hello@metrix.io', href: 'mailto:hello@metrix.io' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-line-subtle py-10">
      <div className="max-w-landing mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-6 h-6 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-accent-ink" />
              </div>
              <span className="text-sm font-semibold text-ink">
                Metrix
              </span>
            </div>
            <p className="text-xs text-ink-3 leading-relaxed max-w-[180px]">
              Barcha analitikangiz bitta minimalist dashboardda.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-medium text-ink-2 mb-3">
                {section}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-ink-3 hover:text-ink transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-line-subtle pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-ink-3">
            © 2025 Metrix. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Maxfiylik siyosati
            </Link>
            <Link
              href="/terms"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Foydalanish shartlari
            </Link>
            <Link
              href="/refund"
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Qaytarish siyosati
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
