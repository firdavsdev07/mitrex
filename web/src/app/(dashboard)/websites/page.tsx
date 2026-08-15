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
import { useWorkspaceStore } from '@/store/workspace';

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [scriptModal, setScriptModal] = useState<Website | null>(null);
  const [script, setScript] = useState('');
  const [error, setError] = useState('');
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

  async function handleDelete(id: string) {
    setError('');
    try {
      await websitesApi.remove(id);
      setWebsites((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError("Saytni o'chirishda xatolik yuz berdi");
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
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
            Saytlar
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">Web Analytics</h1>
        </div>
        <Button onClick={() => setAddModal(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Sayt qo&apos;shish
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : !filteredWebsites.length ? (
        <div className="rounded-xl border border-zinc-800 border-dashed bg-zinc-900/30 p-12 text-center">
          <Globe className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-1">
            Hali sayt qo&apos;shilmagan
          </p>
          <p className="text-xs text-zinc-700 mb-5">
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
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">
                      {site.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {site.domain && (
                        <span className="text-xs text-zinc-600">{site.domain}</span>
                      )}
                      {site.domain && <span className="text-zinc-800 text-[10px]">•</span>}
                      <select
                        value={site.workspaceId ?? 'personal'}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const newWs = val === 'personal' ? null : val;
                          try {
                            await websitesApi.updateWorkspace(site.id, newWs);
                            load();
                          } catch {
                            alert("Sayt jamoasini o'zgartirishda xatolik yuz berdi");
                          }
                        }}
                        className="text-[10px] bg-zinc-900 border border-zinc-850 rounded px-1.5 py-0.5 text-zinc-500 outline-none hover:text-zinc-350 cursor-pointer transition-colors max-w-28 truncate font-medium"
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
                      onClick={() => handleDelete(site.id)}
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
              className="text-orange-400 underline hover:text-orange-300 font-semibold"
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
    <Modal title="Yangi sayt qo'shish" onClose={onClose}>
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
    <Modal title={`${site.name} — Embed Script`} onClose={onClose}>
      <p className="text-sm text-zinc-500 mb-3">
        Quyidagi kodni saytingizning{' '}
        <code className="text-zinc-300 bg-zinc-800 px-1 rounded">
          &lt;head&gt;
        </code>{' '}
        qismiga joylashtiring:
      </p>
      <div className="relative">
        <pre className="text-xs text-zinc-300 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {script}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
        >
          {copied ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
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
