'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  House,
  Globe,
  Waypoints,
  Newspaper,
  Sparkles,
  BellRing,
  Settings2,
  UsersRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LifeBuoy,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import {
  getToken,
  bootstrapSession,
  logoutSession,
  apiClient,
} from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { workspacesApi } from '@/lib/api/workspaces';
import { useWorkspaceStore } from '@/store/workspace';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Select } from '@/components/ui/select';
import { Toaster } from '@/components/ui/toast';

// Ikonkalar almashtirildi. Ilgari `LayoutDashboard`, `Link2`, `FileText`,
// `Users`, `Bell`, `Settings` — texnik va burchakli to'plam edi. Yangilari
// yumaloqroq va mazmunga yaqinroq: uy, tugunlar grafigi, gazeta, qo'ng'iroq.
const navGroups = [
  {
    label: null,
    items: [{ label: 'Dashboard', href: '/dashboard', icon: House }],
  },
  {
    label: 'Kuzatuv',
    items: [
      { label: 'Saytlar', href: '/websites', icon: Globe },
      { label: 'Kanallar', href: '/connections', icon: Waypoints },
      { label: 'Postlar', href: '/posts', icon: Newspaper },
    ],
  },
  {
    label: 'Aql',
    items: [
      { label: 'AI Insights', href: '/insights', icon: Sparkles },
      { label: 'Alertlar', href: '/alerts', icon: BellRing },
    ],
  },
  {
    label: 'Hisob',
    items: [
      { label: 'Jamoalar', href: '/workspaces', icon: UsersRound },
      { label: 'Sozlamalar', href: '/settings', icon: Settings2 },
    ],
  },
];

// Hozircha hech bir sahifa full-bleed emas: /insights ilgari ikkita ustun
// va o'z skrolliga ega edi (`-m-6` + `calc(100vh - 48px)` bilan), endi u
// oddiy sahifa. Ro'yxat kelajak uchun qoldirilgan.
const FULL_BLEED_ROUTES = new Set<string>();

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  websites: 'Saytlar',
  connections: 'Kanallar',
  workspaces: 'Jamoalar',
  posts: 'Postlar',
  insights: 'AI Insights',
  alerts: 'Alertlar',
  settings: 'Sozlamalar',
};

const COLLAPSE_KEY = 'mx.sidebar.collapsed';

interface UsageStats {
  websites: { used: number; limit: number | null };
  platforms: { used: number; limit: number | null };
  views: { used: number; limit: number | null };
  plan: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, setUser } = useAuthStore();
  const { workspaces, activeWorkspace, setWorkspaces, setActiveWorkspace } =
    useWorkspaceStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  // Yig'ilgan holat — foydalanuvchi tanlovi, shuning uchun saqlanadi.
  // Serverda `false` bo'ladi va mount'dan keyin o'qiladi: aks holda
  // hidratsiya mos kelmasdi.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: localStorage faqat mount'dan keyin o'qiladi, aks holda SSR bilan hidratsiya mos kelmaydi
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      return !v;
    });
  }

  useEffect(() => {
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
        setUser(me);
        const ws = await workspacesApi.list().catch(() => []);
        setWorkspaces(ws);
        apiClient
          .get<UsageStats>('/users/me/usage')
          .then((r) => setUsage(r.data))
          .catch(() => {});
        setAuthChecked(true);
      } catch {
        logout();
        router.replace('/login');
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  async function handleLogout() {
    await logoutSession();
    logout();
    router.push('/login');
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="sr-only">Yuklanmoqda</span>
      </div>
    );
  }

  const segment = pathname.split('/')[1] ?? '';
  const crumb = ROUTE_LABELS[segment];
  const fullBleed = FULL_BLEED_ROUTES.has(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-line-subtle bg-surface transition-[width] duration-[var(--mx-dur-transition)] ease-standard lg:flex',
          collapsed ? 'w-[72px]' : 'w-[var(--mx-sidebar)]',
        )}
      >
        <SidebarContent
          pathname={pathname}
          user={user}
          usage={usage}
          collapsed={collapsed}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobil drawer — har doim to'liq kenglikda */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative flex h-full w-[var(--mx-sidebar)] max-w-[85vw] flex-col border-r border-line bg-surface shadow-pop"
            aria-label="Asosiy navigatsiya"
          >
            <SidebarContent
              pathname={pathname}
              user={user}
              usage={usage}
              collapsed={false}
              onLogout={handleLogout}
              onClose={() => setNavOpen(false)}
            />
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[var(--mx-topbar)] shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Yig'ish tugmasi — referensdagi kabi topbarda, eng chapda */}
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"}
              title={collapsed ? 'Menyuni yoyish' : "Menyuni yig'ish"}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink lg:flex"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              )}
            </button>

            <button
              onClick={() => setNavOpen(true)}
              aria-label="Menyuni ochish"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden min-w-0 items-center gap-1.5 text-caption text-ink-3 sm:flex">
              <span>Metrix</span>
              {crumb && (
                <>
                  <span className="text-ink-faint">/</span>
                  <span className="truncate font-medium text-ink-2">
                    {crumb}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Select
              size="sm"
              aria-label="Jamoa tanlash"
              value={activeWorkspace?.id ?? 'personal'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'personal') {
                  setActiveWorkspace(null);
                } else {
                  const ws = workspaces.find((w) => w.id === val);
                  if (ws) setActiveWorkspace(ws);
                }
              }}
              className="max-w-40 truncate"
            >
              <option value="personal">Shaxsiy</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <NotificationBell />
          </div>
        </header>

        <div
          className={cn(
            'min-h-0 flex-1',
            fullBleed ? 'overflow-hidden' : 'overflow-auto p-4 sm:p-6 xl:p-8',
          )}
        >
          {children}
        </div>
      </main>

      <Toaster />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────

function SidebarContent({
  pathname,
  user,
  usage,
  collapsed,
  onLogout,
  onClose,
}: {
  pathname: string;
  user: { name?: string | null; email?: string } | null;
  usage: UsageStats | null;
  collapsed: boolean;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const initial =
    user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?';

  const viewsUsed = usage?.views.used ?? 0;
  const viewsLimit = usage?.views.limit ?? null;
  const pct = viewsLimit ? Math.min((viewsUsed / viewsLimit) * 100, 100) : 0;
  const isFree = (usage?.plan ?? '').toLowerCase() === 'free';

  return (
    <>
      {/* Logo */}
      <div
        className={cn(
          'flex h-[var(--mx-topbar)] shrink-0 items-center border-b border-line-subtle',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent shadow-tile">
            <Zap className="h-4 w-4 text-on-accent" />
          </div>
          {!collapsed && (
            <span className="text-heading tracking-tight text-ink">Metrix</span>
          )}
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Menyuni yopish"
            className="flex h-8 w-8 items-center justify-center rounded-control text-ink-3 hover:bg-surface-hover hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigatsiya */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map(({ label, items }, gi) => (
          <div key={label ?? gi} className={gi > 0 ? 'mt-5' : ''}>
            {label && !collapsed && (
              <p className="mb-1.5 px-3 text-eyebrow uppercase text-ink-faint">
                {label}
              </p>
            )}
            {label && collapsed && gi > 0 && (
              <div className="mx-3 mb-2 border-t border-line-subtle" />
            )}
            <div className="flex flex-col gap-0.5">
              {items.map(({ label: text, href, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? text : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={onClose}
                    className={cn(
                      'flex h-10 items-center gap-3 rounded-control text-body font-medium transition-colors ease-standard duration-[var(--mx-dur-micro)]',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      active
                        ? 'bg-accent text-on-accent shadow-tile'
                        : 'text-ink-2 hover:bg-surface-hover hover:text-ink',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{text}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pastki blok — referensdagi kabi: upgrade, yordam, limit, foydalanuvchi */}
      <div className="shrink-0 border-t border-line-subtle p-2">
        {!collapsed && isFree && (
          <Link
            href="/settings?billing=true"
            className="mb-2 block rounded-control border border-accent-line bg-accent-quiet p-3 transition-colors hover:bg-accent-quiet-hover"
          >
            <p className="flex items-center gap-1.5 text-small font-semibold text-accent-ink">
              <ArrowUpRight className="h-4 w-4" />
              Pro&apos;ga o&apos;tish
            </p>
            <p className="mt-1 text-caption leading-relaxed text-ink-2">
              Cheksiz sayt va tashrif, barcha platformalar, custom AI.
            </p>
          </Link>
        )}

        <Link
          href="/settings"
          title={collapsed ? 'Yordam' : undefined}
          className={cn(
            'flex h-9 items-center gap-3 rounded-control text-small text-ink-3 transition-colors hover:bg-surface-hover hover:text-ink',
            collapsed ? 'justify-center' : 'px-3',
          )}
        >
          <LifeBuoy className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && 'Yordam'}
        </Link>

        {!collapsed && viewsLimit !== null && (
          <div className="mt-2 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-eyebrow uppercase text-ink-faint">
                Oylik tashrif
              </span>
              <span className="text-eyebrow tabular-nums text-ink-3">
                {viewsUsed.toLocaleString()} / {viewsLimit.toLocaleString()}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn(
                  'h-full rounded-full',
                  pct > 85 ? 'bg-negative' : 'bg-accent',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Foydalanuvchi */}
        <div
          className={cn(
            'mt-2 flex items-center gap-2.5 rounded-control bg-surface-sunken',
            collapsed ? 'justify-center p-2' : 'p-2.5',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-caption font-bold text-on-accent">
            {initial}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption font-semibold text-ink">
                  {user?.name ?? user?.email ?? 'Foydalanuvchi'}
                </p>
                <p className="truncate text-eyebrow capitalize text-ink-3">
                  {usage?.plan ?? 'free'} plan
                </p>
              </div>
              <button
                onClick={onLogout}
                aria-label="Chiqish"
                title="Chiqish"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-negative-quiet hover:text-negative-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={onLogout}
            aria-label="Chiqish"
            title="Chiqish"
            className="mt-1 flex h-9 w-full items-center justify-center rounded-control text-ink-3 transition-colors hover:bg-negative-quiet hover:text-negative-ink"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </>
  );
}
