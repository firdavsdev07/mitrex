'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw,
  Unlink,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  connectionsApi,
  PLATFORM_META,
  type Connection,
} from '@/lib/api/connections';
import { platformsApi } from '@/lib/api/platforms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspace';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  RedditIcon,
  FacebookIcon,
  ThreadsIcon,
  PinterestIcon,
} from '@/components/icons/platform-icons';

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  DISCORD: DiscordIcon,
  BLUESKY: BlueskyIcon,
  REDDIT: RedditIcon,
  FACEBOOK: FacebookIcon,
  THREADS: ThreadsIcon,
  PINTEREST: PinterestIcon,
};

const ALL_PLATFORMS = [
  'YOUTUBE',
  'TELEGRAM',
  'INSTAGRAM',
  'DISCORD',
  'BLUESKY',
  'REDDIT',
  'FACEBOOK',
  'THREADS',
  'PINTEREST',
];

// Ulanmagan kartada «nima olasiz» deb aytadi — quruq «Ulanmagan» so'zi
// foydalanuvchiga hech narsa bermaydi.
const PLATFORM_PITCH: Record<string, string> = {
  YOUTUBE: "Obunachilar, ko'rishlar va har bir video statistikasi.",
  TELEGRAM: "Kanal a'zolari va o'sish dinamikasi.",
  INSTAGRAM: 'Kuzatuvchilar, reach va post natijalari.',
  DISCORD: "Server a'zolari va faollik darajasi.",
  BLUESKY: 'Followerlar va post statistikasi.',
  REDDIT: "Subreddit a'zolari va faollik.",
  FACEBOOK: 'Sahifa kuzatuvchilari va reach.',
  THREADS: 'Threads profil statistikasi.',
  PINTEREST: "Pinterest profil ko'rsatkichlari.",
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  discord: 'Discord',
  bluesky: 'Bluesky',
  telegram: 'Telegram',
  reddit: 'Reddit',
  facebook: 'Facebook',
  threads: 'Threads',
  pinterest: 'Pinterest',
};

// OAuth oqimi orqali ulanadigan platformalar. Facebook Instagram bilan bitta
// Meta OAuth oqimini bo'lishadi; Threads esa alohida API va alohida token
// (graph.threads.net) — shuning uchun o'z endpointi bor.
const OAUTH_ENDPOINTS: Record<string, string> = {
  YOUTUBE: '/youtube/connect',
  INSTAGRAM: '/instagram/connect',
  DISCORD: '/discord/connect',
  FACEBOOK: '/instagram/connect',
  THREADS: '/threads/connect',
  PINTEREST: '/pinterest/connect',
};

// "5 daqiqa oldin" kabi nisbiy vaqt — foydalanuvchi "Yangilash" bosgandan
// keyin ma'lumot haqiqatan yangilanganini darhol ko'rishi uchun (faqat sana
// ko'rsatilsa, bir kun ichidagi yangilanish sezilmas edi).
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  return `${day} kun oldin`;
}

function ConnectionsInner() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [youtubeModal, setYoutubeModal] = useState(false);
  const [blueskyModal, setBlueskyModal] = useState(false);
  const [telegramModal, setTelegramModal] = useState(false);
  const [redditModal, setRedditModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Admin panel `enabled`/`comingSoon` orqali qaysi platformalarni ko'rsatishni
  // boshqaradi (masalan Pinterest hozircha Meta app review kutmoqda) — shu
  // sabab bo'sh massiv bilan boshlanadi (hech narsa ko'rsatilmaydi), ALL_PLATFORMS
  // bilan emas: aks holda /platforms hali yuklanmagan bir lahzada admin
  // o'chirgan platforma ham "ulash mumkin" bo'lib ko'rinib ketardi.
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<string>>(
    new Set(),
  );
  const { activeWorkspace } = useWorkspaceStore();

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await connectionsApi.list();
      setConnections(data);
    } catch {
      // Sessiya hali tiklanmagan yoki tarmoq xatosi bo'lishi mumkin —
      // foydalanuvchiga sababsiz bo'sh ro'yxat ko'rsatish o'rniga qayta
      // urinish imkonini beramiz.
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      const name = PLATFORM_LABELS[connected] ?? connected;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
      setSuccessMsg(`${name} muvaffaqiyatli ulandi!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // URL dan param ni olib tashlaymiz
      window.history.replaceState({}, '', '/connections');
    }
    // OAuth callback muvaffaqiyatsiz bo'lsa backend shu ikki param bilan
    // qaytaradi (redirectWithOAuthError) — aks holda foydalanuvchi
    // Google/Meta/Discord'dan qaytgach hech qanday tushuntirishsiz qolardi.
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const name = PLATFORM_LABELS[oauthError] ?? oauthError;
      const message = searchParams.get('message') || '';
      if (message.toLowerCase().includes('limit')) {
        setErrorMsg(
          <span>
            {name}: Tarifingiz chekloviga yetdingiz. Iltimos,{' '}
            <Link
              href="/settings?billing=true"
              className="text-accent-ink underline hover:text-accent-ink font-semibold"
            >
              tarifni yangilang
            </Link>
            .
          </span>,
        );
      } else {
        setErrorMsg(`${name}: ${message || "ulanishda xatolik yuz berdi"}`);
      }
      setTimeout(() => setErrorMsg(null), 8000);
      window.history.replaceState({}, '', '/connections');
    }
    loadConnections();
    platformsApi
      .list()
      .then((list) =>
        setEnabledPlatforms(
          new Set(list.filter((p) => p.enabled).map((p) => p.slug)),
        ),
      )
      .catch(() => {});
  }, []);

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    try {
      await connectionsApi.syncOne(connectionId);
      await loadConnections();
    } catch {
      setErrorMsg('Yangilashda xatolik yuz berdi');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(connectionId: string) {
    try {
      await connectionsApi.disconnect(connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch {
      setErrorMsg('Ulanishni uzishda xatolik yuz berdi');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  function openTelegramModal() {
    setTelegramModal(true);
  }

  // Ilgari jamoa o'zgartirilganda `window.location.reload()` chaqirilardi —
  // butun sahifa qaytadan yuklanardi, bu esa dropdown o'zgarishiga javoban
  // buzilgandek ko'rinadi. Endi holat joyida yangilanadi.
  function handleWorkspaceChange(connectionId: string, workspaceId: string | null) {
    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, workspaceId } : c)),
    );
  }


  // Ulanishlarni HOLAT bo'yicha guruhlaymiz. Ilgari to'qqizta platforma
  // bir xil og'irlikdagi qator bo'lib chiqardi va ko'pchiligi «Ulanmagan»
  // derdi — bitta eskirgan token to'qqizta bir xil qator ichida yo'qolardi.
  const mine = connections.filter((c) =>
    activeWorkspace ? c.workspaceId === activeWorkspace.id : !c.workspaceId,
  );

  const needsAttention = mine.filter(
    (c) => c.tokenStatus === 'expired' || c.tokenStatus === 'expiring_soon',
  );
  const healthy = mine.filter(
    (c) => c.tokenStatus !== 'expired' && c.tokenStatus !== 'expiring_soon',
  );
  const connectedPlatforms = new Set(mine.map((c) => c.platform));
  const available = ALL_PLATFORMS.filter(
    (p) => !connectedPlatforms.has(p) && enabledPlatforms.has(p),
  );

  const cardProps = {
    onSync: handleSync,
    onDisconnect: handleDisconnect,
    onYoutube: () => setYoutubeModal(true),
    onBluesky: () => setBlueskyModal(true),
    onTelegram: openTelegramModal,
    onReddit: () => setRedditModal(true),
    onError: setErrorMsg,
    onWorkspaceChange: handleWorkspaceChange,
  };

  return (
    <div className="mx-auto max-w-wide">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-title text-ink">Kanallar</h1>
          <p className="mt-1.5 text-body text-ink-3">
            Platformalarni ulang — statistika o&apos;zi yangilanib turadi.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-panel border border-line-subtle bg-surface px-4 py-2.5 shadow-card">
          <div className="text-center">
            <p className="text-heading font-bold tabular-nums text-ink">
              {mine.length}
            </p>
            <p className="text-eyebrow uppercase text-ink-3">ulangan</p>
          </div>
          <div className="h-8 w-px bg-line-subtle" />
          <div className="text-center">
            <p
              className={cn(
                'text-heading font-bold tabular-nums',
                needsAttention.length ? 'text-accent-ink' : 'text-ink-3',
              )}
            >
              {needsAttention.length}
            </p>
            <p className="text-eyebrow uppercase text-ink-3">e&apos;tibor</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="mt-5 flex items-center gap-3 rounded-panel border border-positive-line bg-positive-quiet px-4 py-3 text-small text-positive-ink">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mt-5 flex items-center gap-3 rounded-panel border border-negative-line bg-negative-quiet px-4 py-3 text-small text-negative-ink">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {loadError && !isLoading && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-panel border border-negative-line bg-negative-quiet px-4 py-3 text-small text-negative-ink">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Ulanishlarni yuklab bo&apos;lmadi. Internetni tekshiring.
          </span>
          <Button variant="secondary" size="sm" onClick={loadConnections}>
            Qayta urinish
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-panel border border-line-subtle bg-surface"
            />
          ))}
        </div>
      ) : (
        <>
          {/* 1. E'tibor talab qiladi — faqat bo'lsa ko'rinadi */}
          {needsAttention.length > 0 && (
            <Group
              title="E'tibor talab qiladi"
              hint="Bu kanallardan ma'lumot kelmayapti."
              tone="alert"
            >
              {needsAttention.map((conn) => (
                <PlatformCard key={conn.id} conn={conn} {...cardProps} />
              ))}
            </Group>
          )}

          {/* 2. Ulangan */}
          {healthy.length > 0 && (
            <Group title="Ulangan" hint="Ma'lumot muntazam yangilanmoqda.">
              {healthy.map((conn) => (
                <PlatformCard
                  key={conn.id}
                  conn={conn}
                  isSyncing={syncingId === conn.id}
                  {...cardProps}
                />
              ))}
            </Group>
          )}

          {/* 3. Ulash mumkin */}
          {available.length > 0 && (
            <Group
              title="Ulash mumkin"
              hint="Bir bosishda qo'shing — ko'pchiligi uchun parol kerak emas."
            >
              {available.map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  {...cardProps}
                />
              ))}
            </Group>
          )}

          {mine.length === 0 && !isLoading && (
            <p className="mt-8 text-center text-caption text-ink-3">
              Hali birorta kanal ulanmagan — yuqoridan birini tanlang.
            </p>
          )}
        </>
      )}

      {youtubeModal && (
        <YoutubeModal
          onClose={() => setYoutubeModal(false)}
          onSuccess={() => {
            setYoutubeModal(false);
            loadConnections();
          }}
        />
      )}
      {blueskyModal && (
        <BlueskyModal
          onClose={() => setBlueskyModal(false)}
          onSuccess={() => {
            setBlueskyModal(false);
            loadConnections();
          }}
        />
      )}
      {telegramModal && (
        <TelegramModal
          onClose={() => setTelegramModal(false)}
          onSuccess={() => {
            setTelegramModal(false);
            loadConnections();
          }}
        />
      )}
      {redditModal && (
        <RedditModal
          onClose={() => setRedditModal(false)}
          onSuccess={() => {
            setRedditModal(false);
            loadConnections();
          }}
        />
      )}
    </div>
  );
}

// ─── Guruh sarlavhasi ────────────────────────────────────────────────────
// Guruhning o'zi ishni bajaradi: foydalanuvchi «nima buzilgan?» degan
// savolga sarlavhani o'qibgina javob oladi.
function Group({
  title,
  hint,
  tone = 'plain',
  children,
}: {
  title: string;
  hint?: string;
  tone?: 'plain' | 'alert';
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3">
        <h2
          className={cn(
            'text-heading',
            tone === 'alert' ? 'text-accent-ink' : 'text-ink',
          )}
        >
          {title}
        </h2>
        {hint && <p className="text-caption text-ink-3">{hint}</p>}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

// ─── Platforma kartasi ───────────────────────────────────────────────────
// Bitta karta ikkala holatni ham ko'rsatadi: ulangan bo'lsa `conn`
// beriladi, aks holda faqat `platform`.
function PlatformCard({
  conn,
  platform,
  isSyncing,
  onSync,
  onDisconnect,
  onYoutube,
  onBluesky,
  onTelegram,
  onReddit,
  onError,
  onWorkspaceChange,
}: {
  conn?: Connection;
  platform?: string;
  isSyncing?: boolean;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  onYoutube: () => void;
  onBluesky: () => void;
  onTelegram: () => void;
  onReddit: () => void;
  onError: (msg: React.ReactNode) => void;
  onWorkspaceChange: (id: string, workspaceId: string | null) => void;
}) {
  const key = conn?.platform ?? platform!;
  const meta = PLATFORM_META[key];
  const Icon = PLATFORM_ICONS[key];
  const expired = conn?.tokenStatus === 'expired';
  const expiring = conn?.tokenStatus === 'expiring_soon';
  const stat = conn?.stats?.[0];

  return (
    <div
      className={cn(
        'flex flex-col rounded-panel border bg-surface p-5 shadow-card transition-colors',
        expired
          ? 'border-negative-line'
          : expiring
            ? 'border-accent-line'
            : 'border-line-subtle hover:border-line',
      )}
    >
      {/* Yuqori qator: ikonka + holat belgisi */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line-subtle bg-surface-sunken">
          {Icon && <Icon className="h-5 w-5" />}
        </div>

        {expired ? (
          <Badge variant="danger">Uzilgan</Badge>
        ) : expiring ? (
          <Badge variant="warning">Tugayapti</Badge>
        ) : conn ? (
          <Badge variant="success">Ulangan</Badge>
        ) : (
          <span className="rounded-chip bg-surface-sunken px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-wider text-ink-3">
            Ulanmagan
          </span>
        )}
      </div>

      {/* Nom */}
      <h3 className="mt-4 text-heading text-ink">{meta.label}</h3>
      <p className="mt-1 min-h-[2.5rem] text-caption leading-relaxed text-ink-2">
        {conn
          ? expired
            ? `${meta.label} qayta ulanishi kerak — ma'lumot kelishi to'xtagan.`
            : expiring
              ? "Ruxsat tez orada tugaydi. Qayta ulasangiz uzilish bo'lmaydi."
              : (conn.platformUsername ? `@${conn.platformUsername}` : 'Ulangan')
          : (PLATFORM_PITCH[key] ?? 'Statistikani avtomatik yig‘adi.')}
      </p>

      {/* Ulangan bo'lsa — nima yig'ilayotgani */}
      {conn && stat && !expired && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-subtle pt-3 text-caption text-ink-3">
          {stat.followers != null && (
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {stat.followers.toLocaleString()}
              </span>{' '}
              obunachi
            </span>
          )}
          {stat.views != null && (
            <span>
              <span className="font-semibold tabular-nums text-ink">
                {stat.views.toLocaleString()}
              </span>{' '}
              ko&apos;rish
            </span>
          )}
          <span className="ml-auto" title={new Date(stat.updatedAt).toLocaleString('uz-UZ')}>
            {timeAgo(stat.updatedAt)}
          </span>
        </div>
      )}

      {/* Amallar — har doim kartaning pastida */}
      <div className="mt-auto flex items-center gap-2 pt-5">
        {conn ? (
          expired ? (
            <ConnectButton
              platform={key}
              meta={meta}
              onYoutube={onYoutube}
              onBluesky={onBluesky}
              onTelegram={onTelegram}
              onReddit={onReddit}
              onError={onError}
              label="Qayta ulash"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              fullWidth
            />
          ) : (
            <>
              <Link href={`/connections/${conn.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full gap-1.5">
                  Batafsil
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Yangilash"
                title="Yangilash"
                loading={isSyncing}
                onClick={() => onSync(conn.id)}
              >
                {!isSyncing && <RefreshCw className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Uzish"
                title="Uzish"
                onClick={() => onDisconnect(conn.id)}
                className="hover:text-negative-ink"
              >
                <Unlink className="h-3.5 w-3.5" />
              </Button>
            </>
          )
        ) : (
          <ConnectButton
            platform={key}
            meta={meta}
            onYoutube={onYoutube}
            onBluesky={onBluesky}
            onTelegram={onTelegram}
            onReddit={onReddit}
            onError={onError}
            icon={<Plus className="h-3.5 w-3.5" />}
            fullWidth
            quiet
          />
        )}
      </div>

      {/* Jamoa tanlash — faqat ulangan va sog'lom bo'lsa */}
      {conn && !expired && (
        <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-3">
          <span className="text-eyebrow uppercase text-ink-faint">Jamoa</span>
          <WorkspacePicker conn={conn} onChange={onWorkspaceChange} />
        </div>
      )}
    </div>
  );
}

function WorkspacePicker({
  conn,
  onChange,
}: {
  conn: Connection;
  onChange: (id: string, workspaceId: string | null) => void;
}) {
  const { workspaces } = useWorkspaceStore();
  return (
    <Select
      size="sm"
      aria-label="Jamoa"
      className="max-w-40"
      value={conn.workspaceId ?? 'personal'}
      onChange={async (e) => {
        const val = e.target.value;
        const newWs = val === 'personal' ? null : val;
        try {
          await connectionsApi.updateWorkspace(conn.id, newWs);
          onChange(conn.id, newWs);
        } catch {
          toast.error("Jamoani o'zgartirib bo'lmadi. Qayta urinib ko'ring.");
        }
      }}
    >
      <option value="personal">Shaxsiy</option>
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </Select>
  );
}
function ConnectButton({
  platform,
  meta,
  onYoutube,
  onBluesky,
  onTelegram,
  onReddit,
  onError,
  label = 'Ulash',
  icon,
  variant = 'default',
  fullWidth,
  quiet,
}: {
  platform: string;
  meta: { connectType: string };
  onYoutube: () => void;
  onBluesky: () => void;
  onTelegram: () => void;
  onReddit: () => void;
  onError: (msg: React.ReactNode) => void;
  label?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'add';
  /** Kartaning pastida to'liq kenglikni egallaydi. */
  fullWidth?: boolean;
  /** Kontur ko'rinish — sahifada bir nechta bo'lganda. */
  quiet?: boolean;
}) {
  const [connecting, setConnecting] = useState(false);

  // "Yana akkaunt qo'shish" — mavjud platforma bo'limi ostidagi ikkinchi
  // darajali, ajratilgan chiziqli tugma (bosh "Ulash" tugmasidan vizual
  // farqlanishi uchun).
  if (variant === 'add') {
    const addClassName =
      'flex items-center justify-center gap-1.5 text-xs text-ink-3 hover:text-accent-ink border border-dashed border-line hover:border-accent-line rounded-panel py-2.5 transition-colors disabled:opacity-50';

    const dispatch = () => {
      if (meta.connectType === 'youtube') return onYoutube();
      if (meta.connectType === 'bluesky') return onBluesky();
      if (meta.connectType === 'telegram' || meta.connectType === 'telegram_handle')
        return onTelegram();
      if (meta.connectType === 'reddit') return onReddit();
      return handleOAuth();
    };

    async function handleOAuth() {
      const endpoint = OAUTH_ENDPOINTS[platform];
      if (!endpoint) return;
      setConnecting(true);
      try {
        const url = await connectionsApi.getOAuthUrl(endpoint);
        window.location.href = url;
      } catch (err: unknown) {
        setConnecting(false);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          onError(
            <span>
              Tarifingiz chekloviga yetdingiz. Iltimos,{' '}
              <Link
                href="/settings?billing=true"
                className="text-accent-ink underline hover:text-accent-ink font-semibold"
              >
                tarifni yangilang
              </Link>
              .
            </span>,
          );
        } else {
          onError("Ulanish sahifasini yuklab bo'lmadi.");
        }
      }
    }

    return (
      <button
        type="button"
        onClick={dispatch}
        disabled={connecting}
        className={addClassName}
      >
        {icon}
        {connecting ? 'Kutilmoqda...' : label}
      </button>
    );
  }

  if (meta.connectType === 'youtube') {
    return (
      <Button size="sm" variant={quiet ? 'secondary' : 'primary'} onClick={onYoutube} className={cn('gap-1.5', fullWidth && 'w-full')}>
        {icon}
        {label}
      </Button>
    );
  }

  if (meta.connectType === 'bluesky') {
    return (
      <Button size="sm" variant={quiet ? 'secondary' : 'primary'} onClick={onBluesky} className={cn('gap-1.5', fullWidth && 'w-full')}>
        {icon}
        {label}
      </Button>
    );
  }

  if (
    meta.connectType === 'telegram' ||
    meta.connectType === 'telegram_handle'
  ) {
    return (
      <Button size="sm" variant={quiet ? 'secondary' : 'primary'} onClick={onTelegram} className={cn('gap-1.5', fullWidth && 'w-full')}>
        {icon}
        {label}
      </Button>
    );
  }

  if (meta.connectType === 'reddit') {
    return (
      <Button size="sm" variant={quiet ? 'secondary' : 'primary'} onClick={onReddit} className={cn('gap-1.5', fullWidth && 'w-full')}>
        {icon}
        {label}
      </Button>
    );
  }

  // OAuth — JWT bilan endpoint dan URL olamiz
  const endpoint = OAUTH_ENDPOINTS[platform];
  if (!endpoint) return null;

  async function handleOAuth() {
    setConnecting(true);
    try {
      const url = await connectionsApi.getOAuthUrl(endpoint);
      window.location.href = url;
    } catch (err: unknown) {
      setConnecting(false);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        onError(
          <span>
            Tarifingiz chekloviga yetdingiz. Iltimos,{' '}
            <Link
              href="/settings?billing=true"
              className="text-accent-ink underline hover:text-accent-ink font-semibold"
            >
              tarifni yangilang
            </Link>
            .
          </span>,
        );
      } else {
        onError("Ulanish sahifasini yuklab bo'lmadi.");
      }
    }
  }

  return (
    <Button
      size="sm"
      variant={quiet ? 'secondary' : 'primary'}
      loading={connecting}
      onClick={handleOAuth}
      className={cn('gap-1.5', fullWidth && 'w-full')}
    >
      {!connecting && icon}
      {label}
    </Button>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-wide mx-auto animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-panel bg-surface border border-line"
            />
          ))}
        </div>
      }
    >
      <ConnectionsInner />
    </Suspense>
  );
}

// Bluesky/Telegram/Reddit ulash modallari bir xil shaklga ega (state, submit,
// xato ko'rsatish, Bekor/Ulash tugmalari) — faqat sarlavha, izoh, maydonlar va
// API chaqiruvi farq qiladi. YouTube o'zining alohida "Google orqali ulash"
// bo'limi bo'lgani uchun bu umumiy komponentga majburlanmagan, alohida qoldirilgan.
interface ConnectModalField {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  autoComplete?: string;
}

function ConnectModal({
  title,
  description,
  fields,
  defaultErrorMessage,
  validate,
  onSubmit,
  onClose,
  onSuccess,
}: {
  title: string;
  description?: React.ReactNode;
  fields: ConnectModalField[];
  defaultErrorMessage: string;
  validate?: (values: Record<string, string>) => string | null;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ''])),
  );
  const [error, setError] = useState<React.ReactNode>('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (validate) {
      const validationError = validate(values);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(values);
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 403) {
        setError(
          <span>
            Tarifingiz chekloviga yetdingiz. Iltimos,{' '}
            <Link
              href="/settings?billing=true"
              className="text-accent-ink underline hover:text-accent-ink font-semibold"
            >
              tarifni yangilang
            </Link>
            .
          </span>,
        );
      } else {
        const msg = axiosErr.response?.data?.message;
        setError(msg ?? defaultErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal size="md" title={title} onClose={onClose}>
      {description}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {fields.map((f) => (
          <Input
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            type={f.type}
            autoComplete={f.autoComplete}
            value={values[f.key]}
            onChange={(e) =>
              setValues((v) => ({ ...v, [f.key]: e.target.value }))
            }
            hint={f.hint}
          />
        ))}
        {error && (
          <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Bekor
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Ulash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BlueskyModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <ConnectModal
      title="Bluesky ulash"
      description={
        <p className="text-sm text-ink-3 mb-4">
          Bluesky sozlamalaridan App Password yaratib, shu yerga kiriting.
          Asosiy parolingizni kiritmang.
        </p>
      }
      fields={[
        {
          key: 'handle',
          label: 'Handle',
          placeholder: 'yourhandle.bsky.social',
        },
        {
          key: 'appPassword',
          label: 'App Password',
          placeholder: 'xxxx-xxxx-xxxx-xxxx',
          type: 'password',
          autoComplete: 'off',
        },
      ]}
      defaultErrorMessage="Ulashda xatolik. Handle yoki parolni tekshiring."
      onSubmit={(v) =>
        connectionsApi.connectBluesky({
          handle: v.handle,
          appPassword: v.appPassword,
        })
      }
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function YoutubeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!handle.trim()) {
      setError('Kanal handle kiriting');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await connectionsApi.connectYoutube(handle.trim());
      onSuccess();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr.response?.status === 403) {
        setError(
          <span>
            Tarifingiz chekloviga yetdingiz. Iltimos,{' '}
            <Link
              href="/settings?billing=true"
              className="text-accent-ink underline hover:text-accent-ink font-semibold"
            >
              tarifni yangilang
            </Link>
            .
          </span>,
        );
      } else {
        const msg = axiosErr.response?.data?.message;
        setError(
          msg ??
            "Kanal topilmadi. Handle, URL yoki Channel ID ni to'g'ri kiriting.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth() {
    setOauthLoading(true);
    try {
      const url = await connectionsApi.getOAuthUrl('/youtube/oauth/connect');
      window.location.href = url;
    } catch {
      setOauthLoading(false);
    }
  }

  return (
    <Modal size="md" title="YouTube ulash" onClose={onClose}>
      <p className="text-sm text-ink-3 mb-4">
        OAuth talab qilinmaydi — faqat kanal handle yoki URL kiriting.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Kanal handle yoki URL"
          placeholder="@MrBeast yoki youtube.com/c/MrBeast"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          hint="@handle, to'liq URL yoki Channel ID bo'lishi mumkin"
        />
        {error && (
          <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Bekor
          </Button>
          <Button type="submit" className="flex-1" loading={loading}>
            Ulash
          </Button>
        </div>
      </form>

      <div className="mt-4 pt-4 border-t border-line-subtle">
        <p className="text-xs text-ink-3 mb-2">
          Bu FAQAT o&apos;zingiz egalik qiladigan kanal uchun: har bir video
          qancha yangi obunachi olib kelganini ham ko&apos;rish uchun Google
          orqali ulang.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          loading={oauthLoading}
          onClick={handleOAuth}
        >
          Google orqali ulash (obunachi statistikasi bilan)
        </Button>
      </div>
    </Modal>
  );
}

function TelegramModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? 'MetrixBot';

  return (
    <ConnectModal
      title="Telegram kanal ulash"
      description={
        <div className="mb-4 p-3 rounded-control bg-info-quiet border border-info-line text-xs text-info-ink space-y-1">
          <p className="font-medium">
            Avval botni kanalingizga admin sifatida qo&apos;shing:
          </p>
          <p>1. Kanalingiz sozlamalariga o&apos;ting</p>
          <p>2. Administrators → Add Administrator</p>
          <p>
            3. <span className="font-mono text-info-ink">@{botUsername}</span>{' '}
            ni qo&apos;shing
          </p>
          <p>4. Keyin quyidagi formani to&apos;ldiring</p>
        </div>
      }
      fields={[
        {
          key: 'channel',
          label: 'Kanal yoki guruh',
          placeholder: '@mening_kanalim',
          hint: '@handle formatida kiriting',
        },
      ]}
      validate={(v) => (!v.channel.trim() ? 'Kanal handle kiriting' : null)}
      defaultErrorMessage="Kanal topilmadi yoki bot admin emas."
      onSubmit={(v) => connectionsApi.connectTelegram(v.channel.trim())}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function RedditModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <ConnectModal
      title="Reddit ulash"
      description={
        <p className="text-sm text-ink-3 mb-4">
          OAuth talab qilinmaydi — kuzatmoqchi bo&apos;lgan subreddit nomini
          kiriting.
        </p>
      }
      fields={[
        {
          key: 'subreddit',
          label: 'Subreddit',
          placeholder: 'programming',
          hint: 'r/ prefiksisiz, masalan: programming',
        },
      ]}
      validate={(v) =>
        !v.subreddit.trim() ? 'Subreddit nomini kiriting' : null
      }
      defaultErrorMessage="Subreddit topilmadi."
      onSubmit={(v) =>
        connectionsApi.connectReddit(v.subreddit.trim().replace(/^r\//i, ''))
      }
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
