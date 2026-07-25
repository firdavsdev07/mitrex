'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  LayoutDashboard,
  Users,
  CreditCard,
  Puzzle,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { getToken, bootstrapSession, logoutSession } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Foydalanuvchilar', href: '/admin/users', icon: Users },
  { label: 'Planlar', href: '/admin/plans', icon: CreditCard },
  { label: 'Platformalar', href: '/admin/platforms', icon: Puzzle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, setUser } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Sessiyani {children} render qilinishidan oldin tiklaymiz — aks holda
    // bolalar sahifalar access token tayyor bo'lmasdan turib so'rov yuborib,
    // keraksiz 401'lar hosil qiladi (interceptor baribir qayta uradi, lekin
    // konsolda shovqin qoladi).
    async function init() {
      if (!getToken()) {
        const ok = await bootstrapSession();
        if (!ok) {
          logout();
          router.replace('/login');
          return;
        }
      }
      try {
        const me = await authApi.me();
        if (me.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setUser(me);
        setAuthChecked(true);
      } catch {
        logout();
        router.replace('/login');
      }
    }
    init();
  }, []);

  async function handleLogout() {
    await logoutSession();
    logout();
    router.push('/login');
  }

  const pageLabel = navItems.find((n) => n.href === pathname)?.label ?? 'Admin';

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950 overflow-y-auto">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-zinc-800/60 gap-2">
          <div className="w-6 h-6 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">
            Admin
          </span>
          <span className="ml-auto text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded font-medium">
            PANEL
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150',
                  active
                    ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          <div className="mt-auto" />

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            User panelga
          </Link>
        </nav>

        {/* User */}
        <div className="p-2 border-t border-zinc-800/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all group"
          >
            <div className="w-6 h-6 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center text-[10px] font-semibold text-red-400 shrink-0">
              {user?.name?.[0]?.toUpperCase() ??
                user?.email?.[0]?.toUpperCase() ??
                'A'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">
                {user?.name ?? user?.email ?? 'Admin'}
              </p>
              <p className="text-[10px] text-red-500/60">Administrator</p>
            </div>
            <LogOut className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b border-zinc-800/60 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-400">{pageLabel}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
