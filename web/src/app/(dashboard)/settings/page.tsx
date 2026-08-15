'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User,
  Lock,
  BarChart2,
  Trash2,
  ShieldCheck,
  History,
  Monitor,
  LogOut,
  CreditCard,
  Calendar,
  Download,
  Key,
  Plus,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { billingApi, type BillingDetailsResponse, type Invoice } from '@/lib/api/billing';
import { exportApi, triggerDownload } from '@/lib/api/export';
import { apiClient } from '@/lib/api/client';
import { authApi, type LoginEvent } from '@/lib/api/auth';
import { apiKeysApi, type ApiKey } from '@/lib/api/api-keys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

interface UsageStats {
  websites: { used: number; limit: number | null };
  platforms: { used: number; limit: number | null };
  views: { used: number; limit: number | null };
  plan: string;
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'password' | 'security' | 'billing' | 'usage' | 'apikeys' | 'danger'
  >('profile');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('billing')) {
        setTimeout(() => {
          setActiveTab('billing');
        }, 0);
      }
    }
  }, []);

  return (
    <div className="max-w-wide mx-auto">
      <div className="mb-6">
        <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
          Hisob
        </p>
        <h1 className="text-lg font-semibold text-ink">Sozlamalar</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-line">
        {[
          { key: 'profile' as const, label: 'Profil', icon: User },
          { key: 'password' as const, label: 'Parol', icon: Lock },
          { key: 'security' as const, label: 'Xavfsizlik', icon: ShieldCheck },
          { key: 'billing' as const, label: 'Obuna', icon: CreditCard },
          { key: 'usage' as const, label: 'Foydalanish', icon: BarChart2 },
          { key: 'apikeys' as const, label: 'API Kalitlar', icon: Key },
          { key: 'danger' as const, label: 'Xavfli', icon: Trash2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
             key={key}
             onClick={() => setActiveTab(key)}
             className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-all border-b-2 -mb-px ${
              activeTab === key
                ? 'border-accent-line text-accent-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Konteyner keng (1200px), lekin forma o'lchovi tor (720px) — matn
          qatori cho'zilib ketmasligi uchun. Billing va API kalitlar esa
          to'liq kenglikni oladi: ularda uch ustunli tarif to'ri va besh
          ustunli faktura jadvali bor, ular 672px ichida siqilib turardi. */}
      {activeTab === 'profile' && (
        <div className="max-w-narrow">
          <ProfileTab user={user} onUpdate={(u) => setUser({ ...user!, ...u })} />
        </div>
      )}
      {activeTab === 'password' && (
        <div className="max-w-narrow">
          <PasswordTab />
        </div>
      )}
      {activeTab === 'security' && (
        <div className="max-w-narrow">
          <SecurityTab
            user={user}
            onUpdate={(u) => setUser({ ...user!, ...u })}
            onLoggedOutAll={() => router.push('/login')}
          />
        </div>
      )}
      {activeTab === 'billing' && <BillingTab />}
      {activeTab === 'usage' && (
        <div className="max-w-narrow">
          <UsageTab />
        </div>
      )}
      {activeTab === 'apikeys' && <ApiKeysTab />}
      {activeTab === 'danger' && (
        <div className="max-w-narrow">
          <DangerTab onDeleted={() => router.push('/login')} />
        </div>
      )}
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
  const [name, setName] = useState(user?.name ?? '');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.patch('/users/me', { name: name.trim() || null });
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
            value={user?.email ?? ''}
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
            <p className="text-xs text-positive-ink bg-positive-quiet border border-positive-line rounded-control px-3 py-2">
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
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPwd !== confirm) {
      setError('Yangi parollar mos kelmadi');
      return;
    }
    if (newPwd.length < 8) {
      setError("Yangi parol kamida 8 ta belgi bo'lishi kerak");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.patch('/users/me/password', {
        currentPassword: current,
        newPassword: newPwd,
      });
      setCurrent('');
      setNewPwd('');
      setConfirm('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Parol o'zgartirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parolni o&apos;zgartirish</CardTitle>
        <CardDescription>
          Xavfsizlik uchun kuchli parol ishlating
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Joriy parol"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Yangi parol"
            type="password"
            autoComplete="new-password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Kamida 8 ta belgi"
          />
          <Input
            label="Yangi parolni tasdiqlang"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-positive-ink bg-positive-quiet border border-positive-line rounded-control px-3 py-2">
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

function SecurityTab({
  user,
  onUpdate,
  onLoggedOutAll,
}: {
  user: { twoFactorEnabled?: boolean; weeklyDigest?: boolean } | null;
  onUpdate: (u: { twoFactorEnabled?: boolean; weeklyDigest?: boolean }) => void;
  onLoggedOutAll: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <TwoFactorCard
        enabled={!!user?.twoFactorEnabled}
        onChange={(enabled) => onUpdate({ twoFactorEnabled: enabled })}
      />
      <DigestCard
        enabled={user?.weeklyDigest ?? true}
        onChange={(enabled) => onUpdate({ weeklyDigest: enabled })}
      />
      <LoginHistoryCard />
      <LogoutAllCard onLoggedOutAll={onLoggedOutAll} />
    </div>
  );
}

function TwoFactorCard({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.setup2FA();
      setQrDataUrl(res.qrDataUrl);
      setSecret(res.secret);
      setSetupOpen(true);
    } catch {
      setError('2FA sozlashda xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.confirm2FA(code);
      setSetupOpen(false);
      setCode('');
      onChange(true);
    } catch {
      setError("Noto'g'ri kod — qayta urinib ko'ring");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.disable2FA(password);
      setDisableOpen(false);
      setPassword('');
      onChange(false);
    } catch {
      setError("Parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ikki bosqichli autentifikatsiya (2FA)</CardTitle>
            <CardDescription>
              Autentifikator ilova (Google Authenticator, Authy) orqali
              qo&apos;shimcha himoya
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'success' : 'default'}>
            {enabled ? 'Yoqilgan' : "O'chirilgan"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {enabled ? (
          <Button variant="danger" onClick={() => setDisableOpen(true)}>
            2FA&apos;ni o&apos;chirish
          </Button>
        ) : (
          <Button onClick={startSetup} loading={loading}>
            2FA&apos;ni yoqish
          </Button>
        )}
      </CardContent>

      {setupOpen && qrDataUrl && (
        <Modal size="md" title="2FA sozlash" onClose={() => setSetupOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">
              QR kodni autentifikator ilovangiz bilan skanerlang, so&apos;ng 6
              xonali kodni kiriting.
            </p>
            <div className="flex justify-center bg-white rounded-control p-3">
              <Image
                src={qrDataUrl}
                alt="2FA QR kod"
                width={180}
                height={180}
                unoptimized
              />
            </div>
            <p className="text-xs text-ink-3 text-center break-all">
              Qo&apos;lda kiritish:{' '}
              <span className="text-ink-2 font-mono">{secret}</span>
            </p>
            <form onSubmit={confirmSetup} className="flex flex-col gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 text-center text-lg tracking-[0.4em] rounded-control border border-line bg-surface text-ink placeholder:text-ink-faint outline-none focus:border-line-strong focus:ring-1 focus:ring-line-strong"
              />
              {error && <p className="text-xs text-negative-ink">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                Tasdiqlash va yoqish
              </Button>
            </form>
          </div>
        </Modal>
      )}

      {disableOpen && (
        <Modal title="2FA'ni o'chirish" onClose={() => setDisableOpen(false)}>
          <form onSubmit={confirmDisable} className="flex flex-col gap-3">
            <p className="text-sm text-ink-2">
              Tasdiqlash uchun parolingizni kiriting:
            </p>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-xs text-negative-ink">{error}</p>}
            <Button
              type="submit"
              variant="danger"
              loading={loading}
              className="w-full"
            >
              O&apos;chirish
            </Button>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function DigestCard({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await apiClient.patch('/users/me/digest', { enabled: !enabled });
      onChange(!enabled);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Haftalik AI hisobot</CardTitle>
        <CardDescription>
          Har dushanba ertalab email orqali AI tomonidan tayyorlangan haftalik
          tahlil
        </CardDescription>
      </CardHeader>
      <CardContent>
        <button
          onClick={toggle}
          disabled={loading}
          className={`relative w-10 h-5.5 rounded-full transition-colors ${
            enabled ? 'bg-accent' : 'bg-surface-hover'
          } disabled:opacity-50`}
          aria-pressed={enabled}
          aria-label="Haftalik hisobotni yoqish/o'chirish"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform ${
              enabled ? 'translate-x-4.5' : ''
            }`}
          />
        </button>
      </CardContent>
    </Card>
  );
}

function LoginHistoryCard() {
  const [events, setEvents] = useState<LoginEvent[] | null>(null);

  useEffect(() => {
    authApi
      .loginHistory()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-4 h-4 text-ink-3" />
          Kirish tarixi
        </CardTitle>
        <CardDescription>
          Hisobingizga so&apos;nggi kirish urinishlari
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events === null ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-surface-sunken rounded animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-ink-3">Ma&apos;lumot yo&apos;q</p>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Monitor className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-ink-2">
                      {ev.provider}
                      {ev.ip ? ` · ${ev.ip}` : ''}
                    </p>
                    <p className="text-xs text-ink-3">
                      {new Date(ev.createdAt).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>
                <Badge variant={ev.success ? 'success' : 'danger'}>
                  {ev.success ? 'Muvaffaqiyatli' : 'Muvaffaqiyatsiz'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LogoutAllCard({ onLoggedOutAll }: { onLoggedOutAll: () => void }) {
  const [loading, setLoading] = useState(false);
  const { logout } = useAuthStore();

  async function handleClick() {
    setLoading(true);
    try {
      await authApi.logoutAll();
      logout();
      onLoggedOutAll();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOut className="w-4 h-4 text-ink-3" />
          Barcha qurilmalardan chiqish
        </CardTitle>
        <CardDescription>
          Boshqa qurilma/brauzerlarda ochiq bo&apos;lgan barcha sessiyalarni
          yopadi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" onClick={handleClick} loading={loading}>
          Hammasidan chiqish
        </Button>
      </CardContent>
    </Card>
  );
}

function UsageTab() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<UsageStats>('/users/me/usage')
      .then((r) => setUsage(r.data))
      .finally(() => setLoading(false));
  }, []);

  function UsageBar({ used, limit }: { used: number; limit: number | null }) {
    const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
    const color =
      pct > 80 ? 'bg-negative-quiet' : pct > 60 ? 'bg-accent-quiet' : 'bg-accent';
    return (
      <div className="mt-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${limit ? pct : 0}%` }}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan foydalanishi</CardTitle>
        {usage && (
          <CardDescription>
            Plan:{' '}
            <span className="text-ink-2 font-medium">{usage.plan}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-surface-sunken rounded animate-pulse" />
            ))}
          </div>
        ) : usage ? (
          <div className="flex flex-col gap-5">
            {[
              {
                label: 'Saytlar',
                used: usage.websites.used,
                limit: usage.websites.limit,
              },
              {
                label: 'Platformalar',
                used: usage.platforms.used,
                limit: usage.platforms.limit,
              },
              {
                label: 'Oylik tashrif',
                used: usage.views.used,
                limit: usage.views.limit,
              },
            ].map(({ label, used, limit }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink-2">{label}</span>
                  <span className="text-ink-2 font-medium tabular-nums">
                    {used.toLocaleString()}{' '}
                    {limit ? `/ ${limit.toLocaleString()}` : '/ ∞'}
                  </span>
                </div>
                <UsageBar used={used} limit={limit} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-3">Ma&apos;lumot yuklanmadi</p>
        )}
      </CardContent>
    </Card>
  );
}

function DangerTab({ onDeleted }: { onDeleted: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { logout } = useAuthStore();

  async function handleExportData() {
    setExporting(true);
    try {
      const blob = await exportApi.exportMyData();
      triggerDownload(blob, 'metrix-my-data.json');
    } catch (err) {
      console.error('Export error:', err);
      toast.error("Ma'lumotlarni eksport qilib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.delete('/users/me', { data: { password } });
      logout();
      onDeleted();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* GDPR Export Card */}
      <Card>
        <CardHeader>
          <CardTitle>Ma&apos;lumotlarni yuklab olish (GDPR)</CardTitle>
          <CardDescription>
            Sizning barcha profilingiz, veb-saytlaringiz va ulanishlaringiz ma&apos;lumotlarini o&apos;z ichiga olgan JSON formatidagi faylni yuklab oling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            loading={exporting}
            onClick={handleExportData}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Ma&apos;lumotlarimni yuklab olish
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Card */}
      <Card className="border-negative-line">
        <CardHeader>
          <CardTitle className="text-negative-ink">Xavfli zona</CardTitle>
          <CardDescription>
            Hisobni o&apos;chirish qaytarib bo&apos;lmaydigan jarayon.
            Ma&apos;lumotlaringiz 30 kun ichida o&apos;chiriladi.
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
              <p className="text-sm text-ink-2">
                Tasdiqlash uchun parolingizni kiriting:
              </p>
              <Input
                label="Parol"
                type="password"
                autoComplete="current-password"
                placeholder="Parol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirm(false)}
                >
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
    </div>
  );
}

function BillingTab() {
  const [data, setData] = useState<BillingDetailsResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('billing') === 'success') {
        setTimeout(() => {
          setSuccessMsg("To'lov muvaffaqiyatli amalga oshirildi! Obunangiz yangilandi.");
        }, 0);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get('billing') === 'canceled') {
        setTimeout(() => {
          setErrorMsg("To'lov jarayoni bekor qilindi.");
        }, 0);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    async function loadData() {
      try {
        const [res, invRes, usageRes] = await Promise.all([
          billingApi.getSubscription(),
          billingApi.getInvoices().catch(() => ({ invoices: [] })),
          apiClient.get<UsageStats>('/users/me/usage').then((r) => r.data).catch(() => null),
        ]);
        setData(res);
        setInvoices(invRes.invoices);
        setUsage(usageRes);
      } catch (err) {
        console.error("Billing ma'lumotlarini yuklashda xato:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleCheckout(planSlug: string) {
    setCheckoutLoading(planSlug);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await billingApi.checkout(planSlug);
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
      } else {
        setSuccessMsg(res.message || "Plan muvaffaqiyatli bepulga o'tkazildi.");
        const fresh = await billingApi.getSubscription();
        setData(fresh);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Checkout yaratib bo'lmadi.";
      setErrorMsg(msg);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await billingApi.cancel();
      setSuccessMsg(res.message || "Obuna bekor qilindi.");
      setCancelOpen(false);
      const fresh = await billingApi.getSubscription();
      setData(fresh);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Obunani bekor qilib bo'lmadi.";
      setErrorMsg(msg);
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-surface rounded-panel animate-pulse border border-line" />
        ))}
      </div>
    );
  }

  const sub = data?.subscription;
  const currentPlan = data?.plan || { slug: 'free', name: 'Free', price: '0', currency: 'USD' };

  return (
    <div className="flex flex-col gap-6">
      {successMsg && (
        <div className="text-sm text-positive-ink bg-positive-quiet border border-positive-line rounded-control p-3">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="text-sm text-negative-ink bg-negative-quiet border border-negative-line rounded-control p-3">
          {errorMsg}
        </div>
      )}

      <Card className="overflow-hidden border-accent-line relative">
        <div className="absolute top-0 right-0 p-6 flex flex-col items-end">
          <Badge variant={sub?.status === 'ACTIVE' || sub?.status === 'TRIALING' ? 'success' : 'default'}>
            {sub ? (sub.status === 'ACTIVE' ? 'Faol' : sub.status === 'CANCELED' ? 'Bekor qilingan' : sub.status) : 'Bepul plan'}
          </Badge>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent-ink" />
            Joriy tarif: {currentPlan.name}
          </CardTitle>
          <CardDescription>
            {currentPlan.slug === 'free'
              ? "Siz bepul tarifdan foydalanmoqdasiz. Qo'shimcha imkoniyatlar uchun Starter yoki Pro tariflariga o'ting."
              : `Obunangiz narxi: $${Number(currentPlan.price)} / oy.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {usage && (
              <div className="grid grid-cols-3 gap-4 pb-2">
                <div className="bg-surface border border-line rounded-panel p-3">
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider">Saytlar</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">
                    {usage.websites.used} / {usage.websites.limit ?? '∞'}
                  </p>
                </div>
                <div className="bg-surface border border-line rounded-panel p-3">
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider">Platformalar</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">
                    {usage.platforms.used} / {usage.platforms.limit ?? '∞'}
                  </p>
                </div>
                <div className="bg-surface border border-line rounded-panel p-3">
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider">Oylik tashriflar</p>
                  <p className="text-sm font-semibold text-ink mt-0.5">
                    {usage.views.used.toLocaleString()} / {usage.views.limit ? usage.views.limit.toLocaleString() : '∞'}
                  </p>
                </div>
              </div>
            )}

            {sub && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-line-subtle pt-4 gap-3">
                <div className="flex items-center gap-2 text-sm text-ink-2">
                  <Calendar className="w-4 h-4 text-ink-3" />
                  {sub.canceledAt ? (
                    <span>Obuna bekor qilingan. Amaldagi muddat: <strong className="text-ink">{new Date(sub.currentPeriodEnd!).toLocaleDateString('uz-UZ')}</strong></span>
                  ) : (
                    <span>Navbatdagi to&apos;lov sanasi: <strong className="text-ink">{new Date(sub.currentPeriodEnd!).toLocaleDateString('uz-UZ')}</strong></span>
                  )}
                </div>

                {!sub.canceledAt && (
                  <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                    Obunani bekor qilish
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifni o&apos;zgartirish</CardTitle>
          <CardDescription>O&apos;zingizga ma&apos;qul tarifni tanlang. Istalgan vaqtda bekor qilish mumkin.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                slug: 'free',
                name: 'Free',
                price: '$0',
                desc: 'Oddiy kuzatuv',
                features: ['1 ta veb-sayt', '5K oylik tashrif', '30 kunlik saqlash', 'Platformalar yo\'q'],
              },
              {
                slug: 'starter',
                name: 'Starter',
                price: '$9',
                desc: 'Kreatorlar uchun',
                features: ['3 ta veb-sayt', '50K oylik tashrif', '1 yillik ma\'lumot', 'Barcha platformalar', 'AI haftalik hisobot'],
              },
              {
                slug: 'pro',
                name: 'Pro',
                price: '$19',
                desc: 'Professional',
                features: ['Cheksiz veb-sayt', 'Cheksiz tashrif', 'Cheksiz tarix', 'Barcha platformalar', 'Custom AI + Alertlar', 'API kirish'],
              },
            ].map((plan) => {
              const isCurrent = currentPlan.slug === plan.slug;
              return (
                <div
                  key={plan.slug}
                  className={`flex flex-col p-5 rounded-panel border transition-all ${
                    isCurrent
                      ? 'border-accent-line bg-accent-quiet'
                      : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  <h4 className="font-semibold text-ink mb-1">{plan.name}</h4>
                  <p className="text-xs text-ink-3 mb-3">{plan.desc}</p>
                  <div className="text-2xl font-bold text-ink mb-4">
                    {plan.price}
                    <span className="text-xs text-ink-3 font-normal">/oy</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-xs text-ink-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-quiet" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled={isCurrent || checkoutLoading !== null}
                    loading={checkoutLoading === plan.slug}
                    variant={isCurrent ? 'secondary' : 'primary'}
                    onClick={() => handleCheckout(plan.slug)}
                    className="w-full"
                  >
                    {isCurrent ? 'Amaldagi tarif' : plan.slug === 'free' ? 'Downgrade' : 'Yangilash'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>To&apos;lovlar tarixi</CardTitle>
            <CardDescription>Barcha muvaffaqiyatli hisob-kitoblar ro&apos;yxati</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-ink-2">
                <thead className="text-xs uppercase bg-surface text-ink-3 border-b border-line">
                  <tr>
                    <th className="px-4 py-3">Faktura ID</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Tarif</th>
                    <th className="px-4 py-3">Summa</th>
                    <th className="px-4 py-3 text-right">Hujjat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3.5 font-mono text-xs">{inv.id}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {new Date(inv.date).toLocaleDateString('uz-UZ')}
                      </td>
                      <td className="px-4 py-3.5">{inv.plan}</td>
                      <td className="px-4 py-3.5 tabular-nums">
                        ${inv.amount.toFixed(2)} {inv.currency}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {inv.downloadUrl ? (
                          <a
                            href={inv.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent-ink hover:text-accent-ink hover:underline"
                          >
                            Yuklab olish
                          </a>
                        ) : (
                          <span className="text-xs text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {cancelOpen && (
        <Modal title="Obunani bekor qilish" onClose={() => setCancelOpen(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2 leading-relaxed">
              Haqiqatan ham obunangizni bekor qilmoqchimisiz? Bekor qilingandan so&apos;ng, joriy to&apos;lov muddati{' '}
              {sub?.currentPeriodEnd && (
                <strong className="text-ink">({new Date(sub.currentPeriodEnd).toLocaleDateString('uz-UZ')})</strong>
              )}{' '}
              tugaguniga qadar barcha imkoniyatlar siz uchun ochiq qoladi.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="secondary" onClick={() => setCancelOpen(false)}>
                Orqaga
              </Button>
              <Button variant="danger" loading={cancelLoading} onClick={handleCancelSubscription}>
                Ha, bekor qilinsin
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('0');
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadKeys() {
    setLoading(true);
    setError('');
    try {
      const data = await apiKeysApi.list();
      setKeys(data);
    } catch {
      setError("API kalitlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount, asosiy render tugagach ishlaydi
    loadKeys();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('Kalit nomini kiriting');
      return;
    }
    setError('');
    setCreateLoading(true);
    try {
      const days = expiresInDays === '0' ? undefined : Number(expiresInDays);
      const res = await apiKeysApi.create(newKeyName.trim(), days);
      setCreatedKey(res);
      setKeys((prev) => [res, ...prev]);
      setCreateOpen(false);
      setNewKeyName('');
      setExpiresInDays('0');
      setSuccess("Yangi API kalit yaratildi!");
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Kalit yaratishda xatolik yuz berdi");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRevoke() {
    if (!revokeKey) return;
    setError('');
    setRevokeLoading(true);
    try {
      await apiKeysApi.revoke(revokeKey.id);
      setKeys((prev) =>
        prev.map((k) => (k.id === revokeKey.id ? { ...k, isActive: false } : k))
      );
      setRevokeKey(null);
      setSuccess("API kalit o'chirildi (bekor qilindi)!");
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError("Kalitni o'chirishda xatolik yuz berdi");
    } finally {
      setRevokeLoading(false);
    }
  }

  function copyKeyToClipboard() {
    if (!createdKey?.key) return;
    navigator.clipboard.writeText(createdKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      {success && (
        <div className="text-sm text-positive-ink bg-positive-quiet border border-positive-line rounded-control p-3">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-negative-ink bg-negative-quiet border border-negative-line rounded-control p-3">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-accent-ink" />
                API Kalitlar
              </CardTitle>
              <CardDescription>
                Tizimga dasturiy (programmatic) ulanish uchun maxsus kalitlar. Maksimal 5 tagacha faol kalit yaratish mumkin.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setError('');
                setCreateOpen(true);
              }}
              className="gap-1.5 shrink-0"
              disabled={keys.filter((k) => k.isActive).length >= 5}
            >
              <Plus className="w-4 h-4" />
              Kalit yaratish
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-surface border border-line rounded-panel animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-line rounded-panel bg-canvas">
              <Key className="w-8 h-8 text-ink-3 mx-auto mb-3" />
              <p className="text-sm text-ink-2 mb-1">API kalitlar mavjud emas</p>
              <p className="text-xs text-ink-3">Integratsiyani boshlash uchun birinchi API kalitini yarating</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className={`p-4 rounded-panel border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    k.isActive ? 'border-line bg-surface' : 'border-line-subtle bg-canvas opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-ink truncate">{k.name}</p>
                      <Badge variant={k.isActive ? 'success' : 'default'}>
                        {k.isActive ? 'Faol' : "Bekor qilingan"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                      <span className="font-mono text-ink-2 bg-surface px-1 py-0.5 rounded">
                        {k.keyPrefix ?? 'mk_live_'}...
                      </span>
                      <span>
                        Yaratildi: {new Date(k.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                      {k.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-ink-3" />
                          Muddati: {new Date(k.expiresAt).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                      {k.lastUsedAt && (
                        <span>
                          Oxirgi foydalanish: {new Date(k.lastUsedAt).toLocaleDateString('uz-UZ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {k.isActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setRevokeKey(k)}
                      className="gap-1.5 self-start sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      O&apos;chirish
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card className="border-line bg-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Tizimga API orqali ulanish</CardTitle>
          <CardDescription className="text-xs">
            Yaratilgan API kalitingizdan foydalanib Metrix tizimidagi veb-saytlaringiz statistikasini dasturiy ravishda olishingiz mumkin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-ink-2">
            So&apos;rov yuborishda <code className="text-accent-ink font-mono bg-accent-quiet px-1 py-0.5 rounded">X-API-Key</code> sarlavhasini (header) qo&apos;shing.
          </p>
          <div className="relative">
            <pre className="text-xs font-mono bg-canvas border border-line rounded-control p-3 overflow-x-auto text-ink-2">
              {`curl -X GET \\
  -H "X-API-Key: YOUR_API_KEY" \\
  "http://localhost:5000/api/v1/stats?domain=example.com&period=week"`}
            </pre>
          </div>
          <div className="text-xs space-y-1.5 text-ink-3">
            <p className="font-semibold text-ink-2">Parametrlar:</p>
            <div className="flex flex-col gap-1 pl-2">
              <p>• <code className="text-ink-2 font-mono">domain</code>: Saytingiz domeni (masalan: <code className="text-ink-2">myblog.com</code>)</p>
              <p>• <code className="text-ink-2 font-mono">period</code>: Statistika davri (<code className="text-ink-2">today | week | month</code>)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      {createOpen && (
        <Modal size="md" title="Yangi API kalit yaratish" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input
              label="Kalit nomi"
              placeholder="Script yoki Tashqi monitoring"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              hint="Kalit nima maqsad uchun ishlatilishini yozing"
              autoFocus
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expires-select" className="text-sm text-ink-2">Amal qilish muddati</label>
              <select
                id="expires-select"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-control border border-line bg-surface text-ink outline-none transition-all focus:border-line-strong"
              >
                <option value="0">Muddatsiz (Hech qachon tugamaydi)</option>
                <option value="30">30 kun</option>
                <option value="90">90 kun</option>
                <option value="365">365 kun (1 yil)</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" className="flex-1" loading={createLoading}>
                Yaratish
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Show Key Modal (Only Once) */}
      {createdKey && (
        <Modal size="md" title="API Kaliti Yaratildi" onClose={() => setCreatedKey(null)}>
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-accent-quiet border border-accent-line text-xs text-accent-ink rounded-control flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0 text-accent-ink" />
              <div>
                <p className="font-semibold">Muhim ogohlantirish!</p>
                <p className="mt-0.5">Ushbu kalit faqat bir marta ko&apos;rsatiladi. Uni hoziroq nusxalab oling va xavfsiz joyga saqlang.</p>
              </div>
            </div>
            <div className="relative">
              <pre className="text-xs font-mono bg-canvas border border-line rounded-control p-3 pr-10 overflow-x-auto text-accent-ink break-all select-all font-semibold">
                {createdKey.key}
              </pre>
              <button
                type="button"
                onClick={copyKeyToClipboard}
                className="absolute right-2 top-2 p-1 text-ink-3 hover:text-ink transition-colors"
                aria-label="Kalitni nusxalash"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-positive-ink" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => setCreatedKey(null)}
            >
              Men kalitni saqlab oldim
            </Button>
          </div>
        </Modal>
      )}

      {/* Revoke Confirm Modal */}
      {revokeKey && (
        <Modal title="API kalitini bekor qilish" onClose={() => setRevokeKey(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2 leading-relaxed">
              Haqiqatan ham <strong className="text-ink">{revokeKey.name}</strong> nomli API kalitini o&apos;chirmoqchimisiz? Kalit o&apos;chirilgandan so&apos;ng undan foydalangan barcha skript va integratsiyalar ishlamay qoladi. Bu amalni ortga qaytarib bo&apos;lmaydi.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button type="button" variant="secondary" onClick={() => setRevokeKey(null)}>
                Orqaga
              </Button>
              <Button type="button" variant="danger" loading={revokeLoading} onClick={handleRevoke}>
                Ha, o&apos;chirilsin
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
