"use client";

import { useState, useEffect } from "react";
import { User, Lock, BarChart2, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

interface UsageStats {
  websites: { used: number; limit: number | null };
  platforms: { used: number; limit: number | null };
  views: { used: number; limit: number | null };
  plan: string;
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "usage" | "danger">("profile");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Hisob</p>
        <h1 className="text-lg font-semibold text-zinc-100">Sozlamalar</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
        {[
          { key: "profile" as const, label: "Profil", icon: User },
          { key: "password" as const, label: "Parol", icon: Lock },
          { key: "usage" as const, label: "Foydalanish", icon: BarChart2 },
          { key: "danger" as const, label: "Xavfli", icon: Trash2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
              activeTab === key
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <ProfileTab user={user} onUpdate={(u) => setUser({ ...user!, ...u })} />
      )}
      {activeTab === "password" && <PasswordTab />}
      {activeTab === "usage" && <UsageTab />}
      {activeTab === "danger" && <DangerTab onDeleted={() => router.push("/login")} />}
    </div>
  );
}

function ProfileTab({
  user,
  onUpdate,
}: {
  user: { name: string | null; email: string } | null;
  onUpdate: (u: { name: string | null }) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.patch("/users/me", { name: name.trim() || null });
      onUpdate({ name: name.trim() || null });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil ma&apos;lumotlari</CardTitle>
        <CardDescription>Ismingizni o&apos;zgartiring</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            value={user?.email ?? ""}
            disabled
            hint="Email o'zgartirib bo'lmaydi"
          />
          <Input
            label="Ism"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ismingiz"
          />
          {success && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
              Profil yangilandi
            </p>
          )}
          <Button type="submit" loading={loading} className="self-start">
            Saqlash
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordTab() {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPwd !== confirm) { setError("Yangi parollar mos kelmadi"); return; }
    if (newPwd.length < 6) { setError("Yangi parol kamida 6 ta belgi bo'lishi kerak"); return; }
    setError("");
    setLoading(true);
    try {
      await apiClient.patch("/users/me/password", {
        currentPassword: current,
        newPassword: newPwd,
      });
      setCurrent(""); setNewPwd(""); setConfirm("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Parol o'zgartirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parolni o&apos;zgartirish</CardTitle>
        <CardDescription>Xavfsizlik uchun kuchli parol ishlating</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Joriy parol"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Yangi parol"
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Kamida 6 ta belgi"
          />
          <Input
            label="Yangi parolni tasdiqlang"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
              Parol muvaffaqiyatli o&apos;zgartirildi
            </p>
          )}
          <Button type="submit" loading={loading} className="self-start">
            Parolni yangilash
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UsageTab() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<UsageStats>("/users/me/usage")
      .then((r) => setUsage(r.data))
      .finally(() => setLoading(false));
  }, []);

  function UsageBar({ used, limit }: { used: number; limit: number | null }) {
    const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-orange-500";
    return (
      <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${limit ? pct : 0}%` }} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan foydalanishi</CardTitle>
        {usage && <CardDescription>Plan: <span className="text-zinc-300 font-medium">{usage.plan}</span></CardDescription>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        ) : usage ? (
          <div className="flex flex-col gap-5">
            {[
              { label: "Saytlar", used: usage.websites.used, limit: usage.websites.limit },
              { label: "Platformalar", used: usage.platforms.used, limit: usage.platforms.limit },
              { label: "Oylik tashrif", used: usage.views.used, limit: usage.views.limit },
            ].map(({ label, used, limit }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-zinc-300 font-medium tabular-nums">
                    {used.toLocaleString()} {limit ? `/ ${limit.toLocaleString()}` : "/ ∞"}
                  </span>
                </div>
                <UsageBar used={used} limit={limit} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">Ma&apos;lumot yuklanmadi</p>
        )}
      </CardContent>
    </Card>
  );
}

function DangerTab({ onDeleted }: { onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { logout } = useAuthStore();

  async function handleDelete(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.delete("/users/me", { data: { password } });
      logout();
      onDeleted();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="text-red-400">Xavfli zona</CardTitle>
        <CardDescription>
          Hisobni o&apos;chirish qaytarib bo&apos;lmaydigan jarayon. Ma&apos;lumotlaringiz 30 kun ichida o&apos;chiriladi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!confirm ? (
          <Button
            variant="danger"
            onClick={() => setConfirm(true)}
            className="gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Hisobni o&apos;chirish
          </Button>
        ) : (
          <form onSubmit={handleDelete} className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400">
              Tasdiqlash uchun parolingizni kiriting:
            </p>
            <Input
              type="password"
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirm(false)}>
                Bekor
              </Button>
              <Button type="submit" variant="danger" loading={loading}>
                Ha, o&apos;chirish
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
