'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Globe,
  Link2,
  Mail,
  BellRing,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { websitesApi, type Website } from '@/lib/api/websites';
import { connectionsApi, type Connection } from '@/lib/api/connections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';

// ─── types ────────────────────────────────────────────────────────────────────

interface Alert {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  channel: string;
  isActive: boolean;
  websiteId: string | null;
  connectionId: string | null;
  website: { id: string; name: string; domain: string | null } | null;
  connection: {
    id: string;
    platform: string;
    platformUsername: string | null;
  } | null;
  lastTriggered: string | null;
  createdAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  TRAFFIC_SPIKE: "Traffic o'sishi",
  TRAFFIC_DROP: 'Traffic tushishi',
  FOLLOWER_SPIKE: "Obunachi o'sishi",
  FOLLOWER_DROP: 'Obunachi tushishi',
  SITE_DOWN: "Sayt to'xtashi",
  NEW_REFERRER: 'Yangi manba',
};

// Qaysi metric qaysi target turini talab qiladi
const METRIC_TARGET: Record<string, 'website' | 'connection' | null> = {
  TRAFFIC_SPIKE: 'website',
  TRAFFIC_DROP: 'website',
  SITE_DOWN: 'website',
  NEW_REFERRER: 'website',
  FOLLOWER_SPIKE: 'connection',
  FOLLOWER_DROP: 'connection',
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  DISCORD: 'Discord',
  BLUESKY: 'Bluesky',
  REDDIT: 'Reddit',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [error, setError] = useState('');
  // Alert o'chirish qaytarib bo'lmaydigan amal — ilgari tasdiqsiz edi.
  // Alertni qayta yaratish arzon, shuning uchun yozib tasdiqlash shart emas.
  const [deleteTarget, setDeleteTarget] = useState<Alert | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.get<Alert[]>('/alerts');
      setAlerts(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAlert(id: string, current: boolean) {
    setError('');
    try {
      await apiClient.patch(`/alerts/${id}`, { isActive: !current });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !current } : a)),
      );
    } catch {
      setError('Alertni yangilashda xatolik yuz berdi');
    }
  }

  async function deleteAlert() {
    if (!deleteTarget) return;
    setError('');
    setDeleting(true);
    try {
      await apiClient.delete(`/alerts/${deleteTarget.id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success(`«${deleteTarget.name}» o'chirildi`);
      setDeleteTarget(null);
    } catch {
      setError("Alertni o'chirishda xatolik yuz berdi");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-wide mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
            Ogohlantirishlar
          </p>
          <h1 className="text-lg font-semibold text-ink">Alertlar</h1>
          <p className="text-sm text-ink-3 mt-1">
            Muhim o&apos;zgarishlar bo&apos;lganda darhol xabar oling
          </p>
        </div>
        <Button onClick={() => setAddModal(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Alert yaratish
        </Button>
      </div>

      {error && (
        <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-panel border border-line bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-panel border border-line border-dashed bg-surface p-12 text-center">
          <Bell className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="text-sm text-ink-2 mb-1">Hali alert yo&apos;q</p>
          <p className="text-xs text-ink-3 mb-5">
            Traffic tushib ketsa yoki obunachi keskin o&apos;ssa — siz birinchi
            bilasiz
          </p>
          <Button onClick={() => setAddModal(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Birinchi alertni yarating
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-ink">
                        {alert.name}
                      </p>
                      <Badge variant={alert.isActive ? 'success' : 'default'}>
                        {alert.isActive ? 'Faol' : "O'chirilgan"}
                      </Badge>
                      <Badge
                        variant={
                          alert.channel === 'EMAIL' ? 'default' : 'orange'
                        }
                      >
                        {alert.channel === 'EMAIL' ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <BellRing className="w-3 h-3" />
                            In-app
                          </span>
                        )}
                      </Badge>
                    </div>

                    {/* Metric + threshold */}
                    <p className="text-xs text-ink-3">
                      {METRIC_LABELS[alert.metric] ?? alert.metric}
                      {' · '}Chegara:{' '}
                      <span className="text-ink-2">{alert.threshold}x</span>
                    </p>

                    {/* Target: website or connection */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {alert.website && (
                        <span className="flex items-center gap-1 text-xs text-ink-3">
                          <Globe className="w-3 h-3" />
                          {alert.website.name}
                          {alert.website.domain && ` (${alert.website.domain})`}
                        </span>
                      )}
                      {alert.connection && (
                        <span className="flex items-center gap-1 text-xs text-ink-3">
                          <Link2 className="w-3 h-3" />
                          {PLATFORM_LABELS[alert.connection.platform] ??
                            alert.connection.platform}
                          {alert.connection.platformUsername &&
                            ` @${alert.connection.platformUsername}`}
                        </span>
                      )}
                      {alert.lastTriggered && (
                        <span className="text-xs text-ink-3">
                          Oxirgi:{' '}
                          {new Date(alert.lastTriggered).toLocaleDateString(
                            'uz-UZ',
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleAlert(alert.id, alert.isActive)}
                      className="text-ink-3 hover:text-ink transition-colors"
                    >
                      {alert.isActive ? (
                        <ToggleRight className="w-5 h-5 text-positive-ink" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(alert)}
                      aria-label={`«${alert.name}» alertini o'chirish`}
                      className="text-ink-3 hover:text-negative-ink transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {addModal && (
        <AddAlertModal
          onClose={() => setAddModal(false)}
          onSuccess={() => {
            setAddModal(false);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Alertni o'chirish"
          message={
            <>
              <strong className="text-ink">{deleteTarget.name}</strong> alerti
              o&apos;chiriladi va bundan keyin bu holat yuz berganda sizga
              xabar berilmaydi.
            </>
          }
          loading={deleting}
          onConfirm={deleteAlert}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── AddAlertModal ─────────────────────────────────────────────────────────────

function AddAlertModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('TRAFFIC_SPIKE');
  const [threshold, setThreshold] = useState('2');
  const [channel, setChannel] = useState('EMAIL');
  const [websiteId, setWebsiteId] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const targetType = METRIC_TARGET[metric];

  useEffect(() => {
    websitesApi
      .list()
      .then(setWebsites)
      .catch(() => {});
    connectionsApi
      .list()
      .then(setConnections)
      .catch(() => {});
  }, []);

  // Metric o'zgarganda tanlangan target ni tozalaymiz
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount/reset-on-dep-change, asosiy render tugagach ishlaydi
    setWebsiteId('');
    setConnectionId('');
  }, [metric]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nom kiriting');
      return;
    }
    if (targetType === 'website' && !websiteId) {
      setError('Sayt tanlang');
      return;
    }
    if (targetType === 'connection' && !connectionId) {
      setError('Platforma tanlang');
      return;
    }
    const thresholdValue = parseFloat(threshold);
    if (!threshold.trim() || isNaN(thresholdValue) || thresholdValue <= 0) {
      setError("To'g'ri chegara qiymatini kiriting");
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post('/alerts', {
        name: name.trim(),
        metric,
        threshold: thresholdValue,
        channel,
        websiteId: targetType === 'website' ? websiteId : undefined,
        connectionId: targetType === 'connection' ? connectionId : undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Alert yaratishda xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal size="md" title="Yangi alert" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Nom"
          placeholder="Traffic tushishi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Metric */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-ink-2">Vaziyat turi</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-control border border-line bg-surface text-ink outline-none focus:border-line-strong"
          >
            {Object.entries(METRIC_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Target — website */}
        {targetType === 'website' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-ink-2">Sayt</label>
            <select
              value={websiteId}
              onChange={(e) => setWebsiteId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-control border border-line bg-surface text-ink outline-none focus:border-line-strong"
            >
              <option value="">— Sayt tanlang —</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.domain ? ` (${w.domain})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Target — connection */}
        {targetType === 'connection' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-ink-2">Platforma</label>
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-control border border-line bg-surface text-ink outline-none focus:border-line-strong"
            >
              <option value="">— Platforma tanlang —</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {PLATFORM_LABELS[c.platform] ?? c.platform}
                  {c.platformUsername ? ` @${c.platformUsername}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <Input
          label="Chegara (koeffitsient)"
          type="number"
          step="0.1"
          min="0.1"
          placeholder="2.0"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          hint="2.0 = 2x o'sish, 0.5 = 50% tushish"
        />

        {/* Channel */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-ink-2">Xabar usuli</label>
          <div className="flex gap-2">
            {[
              { value: 'EMAIL', icon: Mail, label: 'Email' },
              { value: 'IN_APP', icon: BellRing, label: 'In-app' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setChannel(value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-control border transition-all ${
                  channel === value
                    ? 'border-accent-line bg-accent-quiet text-accent-ink'
                    : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

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
            Yaratish
          </Button>
        </div>
      </form>
    </Modal>
  );
}
