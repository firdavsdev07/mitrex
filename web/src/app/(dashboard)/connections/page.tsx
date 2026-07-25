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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
  RedditIcon,
} from '@/components/icons/platform-icons';

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  DISCORD: DiscordIcon,
  BLUESKY: BlueskyIcon,
  REDDIT: RedditIcon,
};

const ALL_PLATFORMS = [
  'YOUTUBE',
  'TELEGRAM',
  'INSTAGRAM',
  'DISCORD',
  'BLUESKY',
  'REDDIT',
];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  discord: 'Discord',
  bluesky: 'Bluesky',
  telegram: 'Telegram',
  reddit: 'Reddit',
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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
      const message = searchParams.get('message');
      setErrorMsg(`${name}: ${message ?? "ulanishda xatolik yuz berdi"}`);
      setTimeout(() => setErrorMsg(null), 8000);
      window.history.replaceState({}, '', '/connections');
    }
    loadConnections();
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
          Ulashlar
        </p>
        <h1 className="text-lg font-semibold text-zinc-100">Platformalar</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Platformalarni ulang — statistika avtomatik yangilanib turadi
        </p>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Error toast */}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Load error — retry */}
      {loadError && !isLoading && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Ulanishlarni yuklab bo&apos;lmadi. Internetni tekshiring.
          </span>
          <Button variant="secondary" size="sm" onClick={loadConnections}>
            Qayta urinish
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3 mb-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {ALL_PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const Icon = PLATFORM_ICONS[platform];
          const platformConns = connections.filter(
            (c) => c.platform === platform,
          );

          if (platformConns.length === 0) {
            return (
              <ConnectionRow
                key={platform}
                platform={platform}
                meta={meta}
                Icon={Icon}
                conn={undefined}
                isSyncing={false}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
                onYoutube={() => setYoutubeModal(true)}
                onBluesky={() => setBlueskyModal(true)}
                onTelegram={openTelegramModal}
                onReddit={() => setRedditModal(true)}
              />
            );
          }

          return (
            <div key={platform} className="flex flex-col gap-2">
              {platformConns.map((conn) => (
                <ConnectionRow
                  key={conn.id}
                  platform={platform}
                  meta={meta}
                  Icon={Icon}
                  conn={conn}
                  isSyncing={syncingId === conn.id}
                  onSync={handleSync}
                  onDisconnect={handleDisconnect}
                  onYoutube={() => setYoutubeModal(true)}
                  onBluesky={() => setBlueskyModal(true)}
                  onTelegram={openTelegramModal}
                  onReddit={() => setRedditModal(true)}
                />
              ))}

              {/* Yana bitta akkaunt qo'shish — har bir platformada bir
                  nechta ulanish bo'lishi mumkin (masalan 2 ta Telegram
                  kanal), shuning uchun bu tugma allaqachon ulangan
                  platformalarda ham doim ko'rinadi. */}
              <ConnectButton
                platform={platform}
                meta={meta}
                onYoutube={() => setYoutubeModal(true)}
                onBluesky={() => setBlueskyModal(true)}
                onTelegram={openTelegramModal}
                onReddit={() => setRedditModal(true)}
                label={`Yana ${meta.label} akkaunt qo'shish`}
                icon={<Plus className="w-3.5 h-3.5" />}
                variant="add"
              />
            </div>
          );
        })}
      </div>

      {/* YouTube modal */}
      {youtubeModal && (
        <YoutubeModal
          onClose={() => setYoutubeModal(false)}
          onSuccess={() => {
            setYoutubeModal(false);
            loadConnections();
          }}
        />
      )}

      {/* Bluesky modal */}
      {blueskyModal && (
        <BlueskyModal
          onClose={() => setBlueskyModal(false)}
          onSuccess={() => {
            setBlueskyModal(false);
            loadConnections();
          }}
        />
      )}

      {/* Telegram modal */}
      {telegramModal && (
        <TelegramModal
          onClose={() => setTelegramModal(false)}
          onSuccess={() => {
            setTelegramModal(false);
            loadConnections();
          }}
        />
      )}

      {/* Reddit modal */}
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

function ConnectionRow({
  platform,
  meta,
  Icon,
  conn,
  isSyncing,
  onSync,
  onDisconnect,
  onYoutube,
  onBluesky,
  onTelegram,
  onReddit,
}: {
  platform: string;
  meta: { label: string; connectType: string };
  Icon?: React.FC<{ className?: string }>;
  conn: Connection | undefined;
  isSyncing: boolean;
  onSync: (connectionId: string) => void;
  onDisconnect: (connectionId: string) => void;
  onYoutube: () => void;
  onBluesky: () => void;
  onTelegram: () => void;
  onReddit: () => void;
}) {
  const isConnected = !!conn;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0">
            {Icon && <Icon className="w-5 h-5" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-medium text-zinc-200">
                {meta.label}
              </p>
              {isConnected && conn?.tokenStatus === 'ok' && (
                <Badge variant="success">Ulangan</Badge>
              )}
              {isConnected && conn?.tokenStatus === 'expiring_soon' && (
                <Badge variant="orange">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Token tugayapti
                </Badge>
              )}
              {isConnected && conn?.tokenStatus === 'expired' && (
                <Badge
                  variant="default"
                  className="border-red-500/30 bg-red-500/10 text-red-400"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Token eskirgan
                </Badge>
              )}
            </div>
            {conn?.platformUsername && (
              <p className="text-xs text-zinc-600">@{conn.platformUsername}</p>
            )}
            {!isConnected && (
              <p className="text-xs text-zinc-600">Ulanmagan</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isConnected && conn ? (
              conn.tokenStatus === 'expired' ? (
                // Token eskirgan — qayta ulash kerak
                <>
                  <ConnectButton
                    platform={platform}
                    meta={meta}
                    onYoutube={onYoutube}
                    onBluesky={onBluesky}
                    onTelegram={onTelegram}
                    onReddit={onReddit}
                    label="Qayta ulash"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDisconnect(conn.id)}
                    className="gap-1.5"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Uzish
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={isSyncing}
                    onClick={() => onSync(conn.id)}
                    className="gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Yangilash
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDisconnect(conn.id)}
                    className="gap-1.5"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Uzish
                  </Button>
                </>
              )
            ) : (
              <ConnectButton
                platform={platform}
                meta={meta}
                onYoutube={onYoutube}
                onBluesky={onBluesky}
                onTelegram={onTelegram}
                onReddit={onReddit}
              />
            )}
          </div>
        </div>

        {/* Stats row */}
        {conn && conn.stats[0] && (
          <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
            {conn.stats[0].followers != null && (
              <span>
                👥{' '}
                <span className="text-zinc-300 font-medium">
                  {conn.stats[0].followers.toLocaleString()}
                </span>{' '}
                obunachi
              </span>
            )}
            {conn.stats[0].views != null && (
              <span>
                👁{' '}
                <span className="text-zinc-300 font-medium">
                  {conn.stats[0].views.toLocaleString()}
                </span>{' '}
                ko&apos;rish
              </span>
            )}
            {conn.stats[0].likes != null && (
              <span>
                ❤{' '}
                <span className="text-zinc-300 font-medium">
                  {conn.stats[0].likes.toLocaleString()}
                </span>{' '}
                like
              </span>
            )}
            {conn.stats[0].comments != null && (
              <span>
                💬{' '}
                <span className="text-zinc-300 font-medium">
                  {conn.stats[0].comments.toLocaleString()}
                </span>{' '}
                izoh
              </span>
            )}
            {conn.stats[0].engagement != null && (
              <span className="text-orange-400 font-medium">
                {(conn.stats[0].engagement as number).toFixed(1)}% eng
              </span>
            )}
            <span className="ml-auto" title={new Date(conn.stats[0].updatedAt).toLocaleString('uz-UZ')}>
              {timeAgo(conn.stats[0].updatedAt)}
            </span>
          </div>
        )}

        {/* Batafsil link */}
        {isConnected && conn && (
          <Link
            href={`/connections/${conn.id}`}
            className={`flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-orange-400 transition-colors ${
              conn.stats[0] ? 'mt-2' : 'mt-3 pt-3 border-t border-zinc-800/50'
            }`}
          >
            Batafsil statistika
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectButton({
  platform,
  meta,
  onYoutube,
  onBluesky,
  onTelegram,
  onReddit,
  label = 'Ulash',
  icon,
  variant = 'default',
}: {
  platform: string;
  meta: { connectType: string };
  onYoutube: () => void;
  onBluesky: () => void;
  onTelegram: () => void;
  onReddit: () => void;
  label?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'add';
}) {
  const [connecting, setConnecting] = useState(false);

  // "Yana akkaunt qo'shish" — mavjud platforma bo'limi ostidagi ikkinchi
  // darajali, ajratilgan chiziqli tugma (bosh "Ulash" tugmasidan vizual
  // farqlanishi uchun).
  if (variant === 'add') {
    const addClassName =
      'flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 border border-dashed border-zinc-800 hover:border-orange-500/30 rounded-xl py-2.5 transition-colors disabled:opacity-50';

    const dispatch = () => {
      if (meta.connectType === 'youtube') return onYoutube();
      if (meta.connectType === 'bluesky') return onBluesky();
      if (meta.connectType === 'telegram' || meta.connectType === 'telegram_handle')
        return onTelegram();
      if (meta.connectType === 'reddit') return onReddit();
      return handleOAuth();
    };

    async function handleOAuth() {
      const oauthEndpointMap: Record<string, string> = {
        YOUTUBE: '/youtube/connect',
        INSTAGRAM: '/instagram/connect',
        DISCORD: '/discord/connect',
        FACEBOOK: '/instagram/connect',
      };
      const endpoint = oauthEndpointMap[platform];
      if (!endpoint) return;
      setConnecting(true);
      try {
        const url = await connectionsApi.getOAuthUrl(endpoint);
        window.location.href = url;
      } catch {
        setConnecting(false);
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
      <Button size="sm" onClick={onYoutube} className="gap-1.5">
        {icon}
        {label}
      </Button>
    );
  }

  if (meta.connectType === 'bluesky') {
    return (
      <Button size="sm" onClick={onBluesky} className="gap-1.5">
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
      <Button size="sm" onClick={onTelegram} className="gap-1.5">
        {icon}
        {label}
      </Button>
    );
  }

  if (meta.connectType === 'reddit') {
    return (
      <Button size="sm" onClick={onReddit} className="gap-1.5">
        {icon}
        {label}
      </Button>
    );
  }

  // OAuth — JWT bilan endpoint dan URL olamiz
  const oauthEndpointMap: Record<string, string> = {
    YOUTUBE: '/youtube/connect',
    INSTAGRAM: '/instagram/connect',
    DISCORD: '/discord/connect',
    FACEBOOK: '/instagram/connect',
  };

  const endpoint = oauthEndpointMap[platform];
  if (!endpoint) return null;

  async function handleOAuth() {
    setConnecting(true);
    try {
      const url = await connectionsApi.getOAuthUrl(endpoint);
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  }

  return (
    <Button
      size="sm"
      loading={connecting}
      onClick={handleOAuth}
      className="gap-1.5"
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
        <div className="max-w-3xl mx-auto animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-zinc-900/60 border border-zinc-800"
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
  const [error, setError] = useState('');
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
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? defaultErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
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
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
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
        <p className="text-sm text-zinc-500 mb-4">
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
  const [error, setError] = useState('');
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
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(
        msg ??
          "Kanal topilmadi. Handle, URL yoki Channel ID ni to'g'ri kiriting.",
      );
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
    <Modal title="YouTube ulash" onClose={onClose}>
      <p className="text-sm text-zinc-500 mb-4">
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
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
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

      <div className="mt-4 pt-4 border-t border-zinc-800/60">
        <p className="text-xs text-zinc-600 mb-2">
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
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
          <p className="font-medium">
            Avval botni kanalingizga admin sifatida qo&apos;shing:
          </p>
          <p>1. Kanalingiz sozlamalariga o&apos;ting</p>
          <p>2. Administrators → Add Administrator</p>
          <p>
            3. <span className="font-mono text-blue-400">@{botUsername}</span>{' '}
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
        <p className="text-sm text-zinc-500 mb-4">
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
