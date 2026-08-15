'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  Settings,
  Mail,
  ChevronRight,
  Shield,
  Globe,
  Link2,
  Clock,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  workspacesApi,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceInvite,
} from '@/lib/api/workspaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import type { Website } from '@/lib/api/websites';
import type { Connection } from '@/lib/api/connections';

export default function WorkspacesPage() {
  const { user } = useAuthStore();
  const { setWorkspaces } = useWorkspaceStore();
  const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invites' | 'resources' | 'settings'>('members');
  
  // Create / Edit Workspace Form
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Details data
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [wsWebsites, setWsWebsites] = useState<Website[]>([]);
  const [wsConnections, setWsConnections] = useState<Connection[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setLoading(true);
    setError('');
    try {
      const data = await workspacesApi.list();
      setWorkspacesList(data);
      setWorkspaces(data); // update global store too
    } catch {
      setError("Jamoalarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!wsName.trim() || !wsSlug.trim()) {
      setError("Nom va slug kiritilishi shart");
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const ws = await workspacesApi.create({
        name: wsName.trim(),
        slug: wsSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        description: wsDesc.trim() || undefined,
      });
      setCreateOpen(false);
      setWsName('');
      setWsSlug('');
      setWsDesc('');
      setSuccess(`"${ws.name}" jamoasi yaratildi!`);
      setTimeout(() => setSuccess(''), 4000);
      loadWorkspaces();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Jamoa yaratishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadWorkspaceDetails(ws: Workspace) {
    setSelectedWorkspace(ws);
    setDetailsLoading(true);
    setError('');
    setActiveSubTab('members');
    try {
      const [membersData, invitesData, websitesData, connectionsData] = await Promise.all([
        workspacesApi.getMembers(ws.id).catch(() => []),
        workspacesApi.getInvites(ws.id).catch(() => []),
        workspacesApi.getWebsites(ws.id).catch(() => []),
        workspacesApi.getConnections(ws.id).catch(() => []),
      ]);
      setMembers(membersData);
      setInvites(invitesData);
      setWsWebsites(websitesData);
      setWsConnections(connectionsData);
    } catch {
      setError("Tafsilotlarni yuklashda xatolik");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!selectedWorkspace) return;
    try {
      await workspacesApi.updateMemberRole(selectedWorkspace.id, memberId, newRole);
      setSuccess("Rol muvaffaqiyatli yangilandi");
      setTimeout(() => setSuccess(''), 3000);
      // reload members
      const m = await workspacesApi.getMembers(selectedWorkspace.id);
      setMembers(m);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Rolni o'zgartirib bo'lmadi");
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedWorkspace) return;
    try {
      await workspacesApi.removeMember(selectedWorkspace.id, memberId);
      setSuccess("A'zo jamoadan chiqarib yuborildi");
      setTimeout(() => setSuccess(''), 3000);
      setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "A'zoni chiqarib yuborishda xatolik");
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkspace || !inviteEmail.trim()) return;
    setError('');
    setInviteLoading(true);
    try {
      await workspacesApi.invite(selectedWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setSuccess(`Taklifnoma yuborildi: ${inviteEmail}`);
      setTimeout(() => setSuccess(''), 4000);
      setInviteEmail('');
      // reload invites
      const invs = await workspacesApi.getInvites(selectedWorkspace.id);
      setInvites(invs);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Taklif yuborishda xatolik");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!selectedWorkspace) return;
    try {
      await workspacesApi.revokeInvite(selectedWorkspace.id, inviteId);
      setSuccess("Taklifnoma bekor qilindi");
      setTimeout(() => setSuccess(''), 3000);
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
    } catch {
      setError("Taklifni bekor qilishda xatolik");
    }
  }

  async function handleUpdateWorkspaceSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWorkspace) return;
    setIsSubmitting(true);
    setError('');
    try {
      const updated = await workspacesApi.update(selectedWorkspace.id, {
        name: selectedWorkspace.name,
        description: selectedWorkspace.description || undefined,
      });
      setSelectedWorkspace(updated);
      setSuccess("Jamoa sozlamalari saqlandi");
      setTimeout(() => setSuccess(''), 4000);
      loadWorkspaces();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Sozlamalarni saqlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!selectedWorkspace) return;
    if (!confirm(`Haqiqatan ham "${selectedWorkspace.name}" jamoasini butunlay o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi!`)) return;
    setError('');
    try {
      await workspacesApi.remove(selectedWorkspace.id);
      setSuccess("Jamoa butunlay o'chirildi");
      setTimeout(() => setSuccess(''), 4000);
      setSelectedWorkspace(null);
      loadWorkspaces();
    } catch {
      setError("Jamoani o'chirishda xatolik");
    }
  }

  const currentUserRoleInWorkspace = selectedWorkspace
    ? members.find((m) => m.userId === user?.id)?.role
    : null;

  const canManage = currentUserRoleInWorkspace === 'OWNER' || currentUserRoleInWorkspace === 'ADMIN';
  const isOwner = currentUserRoleInWorkspace === 'OWNER';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">
            Jamoalar
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">Workspaces</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Jamoa yaratish
        </Button>
      </div>

      {success && (
        <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/60 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : workspacesList.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-850 rounded-xl bg-zinc-950/20">
          <Users className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
          <p className="text-sm text-zinc-400 mb-1">Jamoalar mavjud emas</p>
          <p className="text-xs text-zinc-650 mb-5">O&apos;z saytlaringiz va ulashlaringizni baham ko&apos;rish uchun jamoa yarating</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Birinchi jamoangizni yarating
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspacesList.map((ws) => (
            <Card
              key={ws.id}
              onClick={() => loadWorkspaceDetails(ws)}
              className="hover:border-zinc-700 cursor-pointer transition-all duration-150"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-32">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xs font-bold text-orange-400">
                        {ws.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200">{ws.name}</h4>
                        <p className="text-[10px] text-zinc-600 font-mono">r/{ws.slug}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1" />
                  </div>
                  {ws.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {ws.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800/40 text-[10px] text-zinc-600 font-medium">
                  <span>A&apos;zolar: <strong className="text-zinc-400">{ws._count?.members ?? 1}</strong></span>
                  <span>Saytlar: <strong className="text-zinc-400">{ws._count?.websites ?? 0}</strong></span>
                  <span>Ulashlar: <strong className="text-zinc-400">{ws._count?.connections ?? 0}</strong></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Drawer Modal */}
      {selectedWorkspace && (
        <Modal
          title={selectedWorkspace.name}
          onClose={() => {
            setSelectedWorkspace(null);
            setError('');
          }}
        >
          {detailsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border-2 border-zinc-750 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Tab selector */}
              <div className="flex border-b border-zinc-850 gap-2">
                {[
                  { key: 'members' as const, label: "A'zolar" },
                  { key: 'invites' as const, label: "Takliflar" },
                  { key: 'resources' as const, label: "Resurslar" },
                  { key: 'settings' as const, label: "Sozlamalar" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSubTab(key)}
                    className={`pb-2 px-3 text-xs font-semibold border-b-2 -mb-px transition-all ${
                      activeSubTab === key
                        ? 'border-orange-500 text-orange-400 font-bold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Members View */}
              {activeSubTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto divide-y divide-zinc-850">
                    {members.map((m) => {
                      const isSelf = m.userId === user?.id;
                      const isOwnerRole = m.role === 'OWNER';
                      return (
                        <div key={m.id} className="flex items-center justify-between py-2 gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-zinc-200 truncate">
                              {m.user.name || m.user.email} {isSelf && <span className="text-[10px] text-zinc-650">(siz)</span>}
                            </p>
                            <p className="text-[10px] text-zinc-600 truncate">{m.user.email}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {canManage && !isSelf && !isOwnerRole ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                                className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 outline-none"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="EDITOR">Muharrir (Editor)</option>
                                <option value="VIEWER">Tomoshabin (Viewer)</option>
                              </select>
                            ) : (
                              <Badge variant={m.role === 'OWNER' ? 'success' : 'default'} className="text-[9px]">
                                {m.role}
                              </Badge>
                            )}

                            {canManage && !isSelf && !isOwnerRole && (
                              <button
                                onClick={() => handleRemoveMember(m.userId)}
                                className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                title="Haydash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invites View */}
              {activeSubTab === 'invites' && (
                <div className="space-y-4">
                  {canManage && (
                    <form onSubmit={handleSendInvite} className="flex gap-2 items-end bg-zinc-900/30 p-3 border border-zinc-850 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <Input
                          label="Elektron pochta"
                          placeholder="hamkor@email.com"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="w-28 shrink-0">
                        <label className="text-[10px] uppercase text-zinc-600 block mb-1">Rol</label>
                        <select
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(
                              e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER',
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 outline-none"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      </div>
                      <Button type="submit" loading={inviteLoading} className="shrink-0">
                        Taklif qilish
                      </Button>
                    </form>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase text-zinc-600 tracking-wider">Kutilayotgan takliflar</p>
                    {invites.length === 0 ? (
                      <p className="text-xs text-zinc-600 py-2">Kutilayotgan takliflar mavjud emas</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-zinc-850">
                        {invites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <p className="font-semibold text-zinc-300">{inv.email}</p>
                              <p className="text-[9px] text-zinc-650 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(inv.expiresAt).toLocaleDateString('uz-UZ')} gacha faol
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px]">{inv.role}</Badge>
                              {canManage && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                                  title="Taklifni bekor qilish"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resources View */}
              {activeSubTab === 'resources' && (
                <div className="space-y-4">
                  <div>
                    <h5 className="text-[10px] uppercase text-zinc-600 tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-zinc-500" />
                      Veb-saytlar ({wsWebsites.length})
                    </h5>
                    {wsWebsites.length === 0 ? (
                      <p className="text-xs text-zinc-600">Jamoaga biriktirilgan saytlar yo&apos;q</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wsWebsites.map((site) => (
                          <div key={site.id} className="p-2.5 bg-zinc-900/20 border border-zinc-850 rounded-lg flex items-center justify-between gap-4">
                            <span className="text-xs font-medium text-zinc-350">{site.name}</span>
                            <span className="text-[10px] font-mono text-zinc-600">{site.domain || 'no-domain'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h5 className="text-[10px] uppercase text-zinc-600 tracking-wider mb-2 flex items-center gap-1.5 mt-2">
                      <Link2 className="w-3 h-3 text-zinc-500" />
                      Platformalar ({wsConnections.length})
                    </h5>
                    {wsConnections.length === 0 ? (
                      <p className="text-xs text-zinc-600">Jamoaga biriktirilgan platformalar yo&apos;q</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wsConnections.map((conn) => (
                          <div key={conn.id} className="p-2.5 bg-zinc-900/20 border border-zinc-850 rounded-lg flex items-center justify-between gap-4">
                            <span className="text-xs font-medium text-zinc-350">{conn.platform}</span>
                            <span className="text-[10px] text-zinc-600">@{conn.platformUsername || 'username'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings View */}
              {activeSubTab === 'settings' && (
                <div className="space-y-4">
                  {canManage ? (
                    <form onSubmit={handleUpdateWorkspaceSettings} className="flex flex-col gap-4">
                      <Input
                        label="Jamoa nomi"
                        value={selectedWorkspace.name}
                        onChange={(e) => setSelectedWorkspace({ ...selectedWorkspace, name: e.target.value })}
                      />
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="ws-desc-area" className="text-sm text-zinc-300">Tavsif (ixtiyoriy)</label>
                        <textarea
                          id="ws-desc-area"
                          rows={3}
                          value={selectedWorkspace.description || ''}
                          onChange={(e) => setSelectedWorkspace({ ...selectedWorkspace, description: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-md border border-zinc-800 bg-zinc-900 text-zinc-150 outline-none focus:border-zinc-700"
                        />
                      </div>
                      <Button type="submit" loading={isSubmitting} className="self-start">
                        Saqlash
                      </Button>
                    </form>
                  ) : (
                    <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl flex gap-2.5 text-zinc-500 text-xs items-start">
                      <Shield className="w-4 h-4 shrink-0 text-zinc-600" />
                      <span>Jamoa sozlamalarini faqat OWNER yoki ADMIN o&apos;zgartira oladi.</span>
                    </div>
                  )}

                  {isOwner && (
                    <div className="pt-4 border-t border-red-500/10 mt-6 flex flex-col gap-3">
                      <div>
                        <h6 className="text-xs font-semibold text-red-400">Jamoani butunlay o&apos;chirish</h6>
                        <p className="text-[11px] text-zinc-600 mt-0.5">Bu jamoani va unga tegishli barcha tahliliy resurslarni butunlay o&apos;chirib yuboradi. Amalni ortga qaytarib bo&apos;lmaydi.</p>
                      </div>
                      <Button type="button" variant="danger" className="self-start gap-1.5" onClick={handleDeleteWorkspace}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Jamoani o&apos;chirish
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Create Workspace Modal */}
      {createOpen && (
        <Modal title="Yangi jamoa yaratish" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input
              label="Jamoa nomi"
              placeholder="Mening Agentligim"
              value={wsName}
              onChange={(e) => {
                setWsName(e.target.value);
                // auto slugify
                setWsSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-_]/g, '')
                );
              }}
              autoFocus
            />
            <Input
              label="Slug"
              placeholder="mening-agentligim"
              value={wsSlug}
              onChange={(e) => setWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              hint="Jamoa havolalari uchun noyob identifikator, masalan: metrix.io/workspaces/join/slug"
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ws-desc" className="text-sm text-zinc-300">Tavsif (ixtiyoriy)</label>
              <textarea
                id="ws-desc"
                rows={3}
                placeholder="Agentlik mijozlari tahlillari va boshqaruv uchun jamoa..."
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-zinc-800 bg-zinc-900 text-zinc-150 outline-none focus:border-zinc-700"
              />
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" className="flex-1" loading={isSubmitting}>
                Yaratish
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
