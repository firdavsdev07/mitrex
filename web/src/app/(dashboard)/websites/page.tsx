'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  BarChart2,
} from 'lucide-react';
import { websitesApi, type Website } from '@/lib/api/websites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { useWorkspaceStore } from '@/store/workspace';

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [scriptModal, setScriptModal] = useState<Website | null>(null);
  const [script, setScript] = useState('');
  const [error, setError] = useState('');
  // Saytni o'chirish uning butun analitika tarixini ham o'chiradi. Ilgari bu
  // bitta bosishda, tasdiqsiz sodir bo'lardi — mahsulotdagi eng xavfli
  // bitta klik edi va u filtr chipi kabi ko'rinardi.
  const [deleteTarget, setDeleteTarget] = useState<Website | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { activeWorkspace, workspaces } = useWorkspaceStore();

  useEffect(() => {
    load();
  }, []);

  const filteredWebsites = websites.filter((site) =>
    activeWorkspace ? site.workspaceId === activeWorkspace.id : !site.workspaceId
  );

  async function load() {
    setLoading(true);
    try {
      const data = await websitesApi.list();
      setWebsites(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setError('');
    setDeleting(true);
    try {
      await websitesApi.remove(deleteTarget.id);
      setWebsites((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} o'chirildi`);
      setDeleteTarget(null);
    } catch {
      setError("Saytni o'chirishda xatolik yuz berdi");
    } finally {
      setDeleting(false);
    }
  }

  async function openScript(site: Website) {
    setError('');
    try {
      const data = await websitesApi.getScript(site.id);
      setScript(data.script);
      setScriptModal(site);
    } catch {
      setError('Skriptni yuklashda xatolik yuz berdi');
    }
  }

  return (
    <div className="max-w-wide mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
            Saytlar
          </p>
          <h1 className="text-lg font-semibold text-ink">Web Analytics</h1>
        </div>
        <Button onClick={() => setAddModal(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Sayt qo&apos;shish
        </Button>
      </div>

      {error && (
        <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-panel border border-line bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : !filteredWebsites.length ? (
        <div className="rounded-panel border border-line border-dashed bg-surface p-12 text-center">
          <Globe className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="text-sm text-ink-2 mb-1">
            Hali sayt qo&apos;shilmagan
          </p>
          <p className="text-xs text-ink-3 mb-5">
            Saytingizni qo&apos;shing va bir qatorli kod bilan statistikani
            kuzating
          </p>
          <Button onClick={() => setAddModal(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Birinchi saytni qo&apos;shing
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredWebsites.map((site) => (
            <Card key={site.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-panel bg-surface-sunken border border-line flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-ink-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {site.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {site.domain && (
                        <span className="text-xs text-ink-3">{site.domain}</span>
                      )}
                      {site.domain && <span className="text-ink-3 text-[10px]">•</span>}
                      <select
                        value={site.workspaceId ?? 'personal'}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const newWs = val === 'personal' ? null : val;
                          try {
                            await websitesApi.updateWorkspace(site.id, newWs);
                            load();
                          } catch {
                            toast.error(
                              "Sayt jamoasini o'zgartirib bo'lmadi. Qayta urinib ko'ring.",
                            );
                          }
                        }}
                        className="text-[10px] bg-surface border border-line rounded px-1.5 py-0.5 text-ink-3 outline-none hover:text-ink cursor-pointer transition-colors max-w-28 truncate font-medium"
                      >
                        <option value="personal">Shaxsiy</option>
                        {workspaces.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openScript(site)}
                      className="gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Script
                    </Button>
                    <Link href={`/websites/${site.id}`}>
                      <Button variant="secondary" size="sm" className="gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5" />
                        Statistika
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`${site.name} saytini o'chirish`}
                      onClick={() => setDeleteTarget(site)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {addModal && (
        <AddWebsiteModal
          onClose={() => setAddModal(false)}
          onSuccess={() => {
            setAddModal(false);
            load();
          }}
        />
      )}

      {scriptModal && (
        <ScriptModal
          site={scriptModal}
          script={script}
          onClose={() => setScriptModal(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Saytni o'chirish"
          message={
            <>
              <strong className="text-ink">{deleteTarget.name}</strong> saytini
              o&apos;chirmoqchimisiz? Bu amalni ortga qaytarib bo&apos;lmaydi.
            </>
          }
          consequence={`${deleteTarget.domain ?? deleteTarget.name} uchun to'plangan barcha tashrif, sahifa va hodisa ma'lumotlari`}
          // Domen bor bo'lsa aynan uni yozdiramiz — tasodifiy o'chirishning
          // oldini oladigan eng arzon to'siq.
          confirmText={deleteTarget.domain ?? undefined}
          confirmLabel="Ha, o'chirilsin"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function AddWebsiteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [loading, setLoading] = useState(false);
  const { activeWorkspace } = useWorkspaceStore();

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nom kiriting');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await websitesApi.create({
        name: name.trim(),
        domain: domain.trim() || undefined,
        workspaceId: activeWorkspace?.id,
      });
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
        setError(msg ?? "Sayt qo'shishda xatolik");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal size="md" title="Yangi sayt qo'shish" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Sayt nomi"
          placeholder="Mening blogim"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Domen (ixtiyoriy)"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          hint="Protokolsiz kiriting: example.com"
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
            Qo&apos;shish
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ScriptModal({
  site,
  script,
  onClose,
}: {
  site: Website;
  script: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal size="lg" title={`${site.name} — Embed Script`} onClose={onClose}>
      <p className="text-sm text-ink-3 mb-3">
        Quyidagi kodni saytingizning{' '}
        <code className="text-ink-2 bg-surface-sunken px-1 rounded">
          &lt;head&gt;
        </code>{' '}
        qismiga joylashtiring:
      </p>
      <div className="relative">
        <pre className="text-xs text-ink-2 bg-surface-sunken border border-line rounded-control p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {script}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 text-ink-3 hover:text-ink transition-colors p-1"
        >
          {copied ? (
            <CheckCircle className="w-4 h-4 text-positive-ink" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
      <Button variant="secondary" className="w-full mt-3" onClick={onClose}>
        Yopish
      </Button>
    </Modal>
  );
}
