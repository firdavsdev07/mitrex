"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  LayoutDashboard,
  Globe,
  Link2,
  FileText,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { getToken } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
import { NotificationBell } from "@/components/ui/notification-bell";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Saytlar", href: "/websites", icon: Globe },
  { label: "Ulashlar", href: "/connections", icon: Link2 },
  { label: "Postlar", href: "/posts", icon: FileText },
  { label: "AI Insights", href: "/insights", icon: Sparkles },
  { label: "Alertlar", href: "/alerts", icon: Bell },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, setUser } = useAuthStore();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    authApi.me().then(setUser).catch(() => {
      logout();
      router.replace("/login");
    });
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-zinc-800/60">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">Metrix</span>
          </Link>
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
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
                  active
                    ? "bg-orange-500/10 text-orange-400 border border-orange-500/15"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          <div className="mt-auto" />

          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-150",
              pathname === "/settings"
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/15"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Sozlamalar
          </Link>
        </nav>

        {/* User */}
        <div className="p-2 border-t border-zinc-800/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 group"
          >
            <div className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center text-[10px] font-semibold text-orange-400 shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">
                {user?.name ?? user?.email ?? "Foydalanuvchi"}
              </p>
              <p className="text-[10px] text-zinc-600 truncate">{user?.email}</p>
            </div>
            <LogOut className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-12 border-b border-zinc-800/60 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-1 text-xs text-zinc-600">
            <span>Metrix</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-zinc-400 capitalize">
              {pathname === "/dashboard" ? "Dashboard" : pathname.split("/").pop()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
