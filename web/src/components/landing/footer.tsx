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
    <footer className="border-t border-zinc-800/50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">
                Metrix
              </span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-[180px]">
              Barcha analitikangiz bitta minimalist dashboardda.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <p className="text-xs font-medium text-zinc-400 mb-3">
                {section}
              </p>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
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
        <div className="border-t border-zinc-800/30 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-700">
            © 2025 Metrix. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="#"
              className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
            >
              Maxfiylik siyosati
            </Link>
            <Link
              href="#"
              className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
            >
              Foydalanish shartlari
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
