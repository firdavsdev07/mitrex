"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Ban, CheckCircle, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PLAN_SLUGS = ["free", "starter", "pro"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState<AdminUser | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page: p, search: q || undefined });
      setUsers(res.users);
      setTotal(res.total);
      setPages(res.pages);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(1, search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => { load(page, search); }, [page]);

  async function handleBan(user: AdminUser) {
    const banned = !user.deletedAt;
    await adminApi.banUser(user.id, banned);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, deletedAt: banned ? new Date().toISOString() : null } : u
      )
    );
  }

  async function handlePlanChange(userId: string, plan: string) {
    await adminApi.changeUserPlan(userId, plan);
    setPlanModal(null);
    load(page, search);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Admin</p>
          <h1 className="text-lg font-semibold text-zinc-100">Foydalanuvchilar</h1>
          <p className="text-sm text-zinc-500 mt-1">Jami: {total} ta foydalanuvchi</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email yoki ism bo'yicha qidirish..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-4 py-2 border-b border-zinc-800/60 text-xs text-zinc-600 uppercase tracking-wider">
            <span>Foydalanuvchi</span>
            <span>Plan</span>
            <span>Saytlar</span>
            <span>Qo'shilgan</span>
            <span>Amallar</span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-zinc-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-600">
              Foydalanuvchi topilmadi
            </div>
          ) : (
            users.map((user, i) => {
              const isLast = i === users.length - 1;
              const isBanned = !!user.deletedAt;
              return (
                <div
                  key={user.id}
                  className={`grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 items-center px-4 py-3 ${
                    !isLast ? "border-b border-zinc-800/40" : ""
                  } ${isBanned ? "opacity-50" : ""}`}
                >
                  {/* User info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 shrink-0">
                        {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate font-medium">
                          {user.name ?? "—"}
                        </p>
                        <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                      </div>
                      {user.role === "ADMIN" && (
                        <Badge variant="orange">Admin</Badge>
                      )}
                    </div>
                  </div>

                  {/* Plan */}
                  <div>
                    <span className="text-xs text-zinc-400">
                      {user.subscription?.plan?.name ?? "Free"}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="text-xs text-zinc-500">
                    {user._count.websites} sayt · {user._count.connections} kanal
                  </div>

                  {/* Date */}
                  <div className="text-xs text-zinc-600">
                    {new Date(user.createdAt).toLocaleDateString("uz-UZ")}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPlanModal(user)}
                      title="Plan o'zgartirish"
                      className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => handleBan(user)}
                        title={isBanned ? "Blokni ochish" : "Bloklash"}
                        className={`p-1.5 rounded-md transition-all ${
                          isBanned
                            ? "text-green-500 hover:bg-green-500/10"
                            : "text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                        }`}
                      >
                        {isBanned ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-500">
            {page} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Plan modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPlanModal(null)} />
          <div className="relative w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Plan o'zgartirish</h3>
            <p className="text-xs text-zinc-500 mb-4 truncate">{planModal.email}</p>
            <div className="flex flex-col gap-2">
              {PLAN_SLUGS.map((slug) => {
                const current = planModal.subscription?.plan?.slug === slug;
                return (
                  <button
                    key={slug}
                    onClick={() => handlePlanChange(planModal.id, slug)}
                    className={`px-4 py-2.5 rounded-lg text-sm text-left border transition-all ${
                      current
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                        : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="capitalize font-medium">{slug}</span>
                    {current && (
                      <span className="ml-2 text-xs text-orange-400/60">(hozirgi)</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPlanModal(null)}
              className="mt-3 w-full py-2 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Bekor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
