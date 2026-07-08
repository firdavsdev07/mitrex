"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Unlink, CheckCircle, X, AlertTriangle, RotateCcw } from "lucide-react";
import { connectionsApi, PLATFORM_META, type Connection } from "@/lib/api/connections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  YouTubeIcon,
  TelegramIcon,
  InstagramIcon,
  DiscordIcon,
  BlueskyIcon,
} from "@/components/icons/platform-icons";

const PLATFORM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  YOUTUBE: YouTubeIcon,
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  DISCORD: DiscordIcon,
  BLUESKY: BlueskyIcon,
};

const ALL_PLATFORMS = ["YOUTUBE", "TELEGRAM", "INSTAGRAM", "DISCORD", "BLUESKY"];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube", instagram: "Instagram", discord: "Discord",
  bluesky: "Bluesky", telegram: "Telegram",
};

function ConnectionsInner() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [youtubeModal, setYoutubeModal] = useState(false);
  const [blueskyModal, setBlueskyModal] = useState(false);
  const [telegramModal, setTelegramModal] = useState(false);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await connectionsApi.list();
      setConnections(data);
    } catch {
      // silent fail — empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      const name = PLATFORM_LABELS[connected] ?? connected;
      setSuccessMsg(`${name} muvaffaqiyatli ulandi!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // URL dan param ni olib tashlaymiz
      window.history.replaceState({}, "", "/connections");
    }
    loadConnections();
  }, []);


  async function handleSync(platform: string) {
    setSyncingPlatform(platform);
    try {
      await connectionsApi.syncOne(platform);
      await loadConnections();
    } finally {
      setSyncingPlatform(null);
    }
  }

  async function handleDisconnect(platform: string) {
    await connectionsApi.disconnect(platform);
    setConnections((prev) => prev.filter((c) => c.platform !== platform));
  }

  function openTelegramModal() {
    setTelegramModal(true);
  }

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Ulashlar</p>
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

      {isLoading && (
        <div className="flex flex-col gap-3 mb-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ALL_PLATFORMS.map((platform) => {
          const meta = PLATFORM_META[platform];
          const conn = connections.find((c) => c.platform === platform);
          const isConnected = connectedPlatforms.has(platform);
          const Icon = PLATFORM_ICONS[platform];
          const isSyncing = syncingPlatform === platform;

          return (
            <Card key={platform}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0">
                    {Icon && <Icon className="w-5 h-5" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-zinc-200">{meta.label}</p>
                      {isConnected && conn?.tokenStatus === "ok" && (
                        <Badge variant="success">Ulangan</Badge>
                      )}
                      {isConnected && conn?.tokenStatus === "expiring_soon" && (
                        <Badge variant="orange">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Token tugayapti
                        </Badge>
                      )}
                      {isConnected && conn?.tokenStatus === "expired" && (
                        <Badge variant="default" className="border-red-500/30 bg-red-500/10 text-red-400">
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
                    {isConnected ? (
                      conn?.tokenStatus === "expired" ? (
                        // Token eskirgan — qayta ulash kerak
                        <>
                          <ConnectButton
                            platform={platform}
                            meta={meta}
                            onYoutube={() => setYoutubeModal(true)}
                            onBluesky={() => setBlueskyModal(true)}
                            onTelegram={openTelegramModal}
                            label="Qayta ulash"
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDisconnect(platform)}
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
                            onClick={() => handleSync(platform)}
                            className="gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Yangilash
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDisconnect(platform)}
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
                        onYoutube={() => setYoutubeModal(true)}
                        onBluesky={() => setBlueskyModal(true)}
                        onTelegram={openTelegramModal}
                      />
                    )}
                  </div>
                </div>

                {/* Stats row */}
                {conn && conn.stats[0] && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
                    {conn.stats[0].followers != null && (
                      <span>👥 <span className="text-zinc-300 font-medium">{conn.stats[0].followers.toLocaleString()}</span> obunachi</span>
                    )}
                    {conn.stats[0].views != null && (
                      <span>👁 <span className="text-zinc-300 font-medium">{conn.stats[0].views.toLocaleString()}</span> ko&apos;rish</span>
                    )}
                    {conn.stats[0].likes != null && (
                      <span>❤ <span className="text-zinc-300 font-medium">{conn.stats[0].likes.toLocaleString()}</span> like</span>
                    )}
                    {conn.stats[0].comments != null && (
                      <span>💬 <span className="text-zinc-300 font-medium">{conn.stats[0].comments.toLocaleString()}</span> izoh</span>
                    )}
                    {conn.stats[0].engagement != null && (
                      <span className="text-orange-400 font-medium">{(conn.stats[0].engagement as number).toFixed(1)}% eng</span>
                    )}
                    <span className="ml-auto">
                      {new Date(conn.stats[0].date).toLocaleDateString("uz-UZ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* YouTube modal */}
      {youtubeModal && (
        <YoutubeModal
          onClose={() => setYoutubeModal(false)}
          onSuccess={() => { setYoutubeModal(false); loadConnections(); }}
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
          onSuccess={() => { setTelegramModal(false); loadConnections(); }}
        />
      )}
    </div>
  );
}

function ConnectButton({
  platform,
  meta,
  onYoutube,
  onBluesky,
  onTelegram,
  label = "Ulash",
  icon,
}: {
  platform: string;
  meta: { connectType: string };
  onYoutube: () => void;
  onBluesky: () => void;
  onTelegram: () => void;
  label?: string;
  icon?: React.ReactNode;
}) {
  const [connecting, setConnecting] = useState(false);

  if (meta.connectType === "youtube") {
    return (
      <Button size="sm" onClick={onYoutube} className="gap-1.5">
        {icon}{label}
      </Button>
    );
  }

  if (meta.connectType === "bluesky") {
    return (
      <Button size="sm" onClick={onBluesky} className="gap-1.5">
        {icon}{label}
      </Button>
    );
  }

  if (meta.connectType === "telegram" || meta.connectType === "telegram_handle") {
    return (
      <Button size="sm" onClick={onTelegram} className="gap-1.5">
        {icon}{label}
      </Button>
    );
  }

  // OAuth — JWT bilan endpoint dan URL olamiz
  const oauthEndpointMap: Record<string, string> = {
    YOUTUBE:   "/youtube/connect",
    INSTAGRAM: "/instagram/connect",
    DISCORD:   "/discord/connect",
    FACEBOOK:  "/instagram/connect",
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
    <Button size="sm" loading={connecting} onClick={handleOAuth} className="gap-1.5">
      {!connecting && icon}{label}
    </Button>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto animate-pulse space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-xl bg-zinc-900/60 border border-zinc-800"/>)}</div>}>
      <ConnectionsInner />
    </Suspense>
  );
}

function BlueskyModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await connectionsApi.connectBluesky({ handle, appPassword });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Ulashda xatolik. Handle yoki parolni tekshiring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Bluesky ulash" onClose={onClose}>
      <p className="text-sm text-zinc-500 mb-4">
        Bluesky sozlamalaridan App Password yaratib, shu yerga kiriting.
        Asosiy parolingizni kiritmang.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Handle"
          placeholder="yourhandle.bsky.social"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
        />
        <Input
          label="App Password"
          placeholder="xxxx-xxxx-xxxx-xxxx"
          type="password"
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
        />
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
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

function YoutubeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!handle.trim()) { setError("Kanal handle kiriting"); return; }
    setError("");
    setLoading(true);
    try {
      await connectionsApi.connectYoutube(handle.trim());
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Kanal topilmadi. Handle, URL yoki Channel ID ni to'g'ri kiriting.");
    } finally {
      setLoading(false);
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
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
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

function TelegramModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? "MetrixBot";

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!channel.trim()) { setError("Kanal handle kiriting"); return; }
    setError("");
    setLoading(true);
    try {
      await connectionsApi.connectTelegram(channel.trim());
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Kanal topilmadi yoki bot admin emas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Telegram kanal ulash" onClose={onClose}>
      <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
        <p className="font-medium">Avval botni kanalingizga admin sifatida qo&apos;shing:</p>
        <p>1. Kanalingiz sozlamalariga o&apos;ting</p>
        <p>2. Administrators → Add Administrator</p>
        <p>3. <span className="font-mono text-blue-400">@{botUsername}</span> ni qo&apos;shing</p>
        <p>4. Keyin quyidagi formani to&apos;ldiring</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Kanal yoki guruh"
          placeholder="@mening_kanalim"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          hint="@handle formatida kiriting"
        />
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 mt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
