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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  
  // Destruktiv amallar. Jamoani o'chirish brauzerning native `confirm()`
  // oynasini ishlatardi, a'zoni chiqarish esa umuman tasdiqsiz edi —
  // holbuki ikkalasi ham ortga qaytarib bo'lmaydi.
  const [deleteWsOpen, setDeleteWsOpen] = useState(false);
  const [deletingWs, setDeletingWs] = useState(false);
  const [removeMember, setRemoveMember] = useState<WorkspaceMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

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

  async function handleRemoveMember() {
    if (!selectedWorkspace || !removeMember) return;
    setRemovingMember(true);
    try {
      await workspacesApi.removeMember(selectedWorkspace.id, removeMember.userId);
      setSuccess("A'zo jamoadan chiqarib yuborildi");
      setTimeout(() => setSuccess(''), 3000);
      setMembers((prev) => prev.filter((m) => m.userId !== removeMember.userId));
      setRemoveMember(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "A'zoni chiqarib yuborishda xatolik");
    } finally {
      setRemovingMember(false);
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
    setError('');
    setDeletingWs(true);
    try {
      await workspacesApi.remove(selectedWorkspace.id);
      setSuccess("Jamoa butunlay o'chirildi");
      setTimeout(() => setSuccess(''), 4000);
      setDeleteWsOpen(false);
      setSelectedWorkspace(null);
      loadWorkspaces();
    } catch {
      setError("Jamoani o'chirishda xatolik");
    } finally {
      setDeletingWs(false);
    }
  }

  const currentUserRoleInWorkspace = selectedWorkspace
    ? members.find((m) => m.userId === user?.id)?.role
    : null;

  const canManage = currentUserRoleInWorkspace === 'OWNER' || currentUserRoleInWorkspace === 'ADMIN';
  const isOwner = currentUserRoleInWorkspace === 'OWNER';

  return (
    <div className="max-w-wide mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-ink-3 uppercase tracking-wider mb-0.5">
            Jamoalar
          </p>
          <h1 className="text-lg font-semibold text-ink">Workspaces</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Jamoa yaratish
        </Button>
      </div>

      {success && (
        <div className="text-sm text-positive-ink bg-positive-quiet border border-positive-line rounded-control p-3 mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="text-sm text-negative-ink bg-negative-quiet border border-negative-line rounded-control p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-surface border border-line rounded-panel animate-pulse" />
          ))}
        </div>
      ) : workspacesList.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-line rounded-panel bg-canvas">
          <Users className="w-10 h-10 text-ink-3 mx-auto mb-4" />
          <p className="text-sm text-ink-2 mb-1">Jamoalar mavjud emas</p>
          <p className="text-xs text-ink-3 mb-5">O&apos;z saytlaringiz va ulashlaringizni baham ko&apos;rish uchun jamoa yarating</p>
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
              className="hover:border-line-strong cursor-pointer transition-all duration-150"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-32">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-control bg-accent-quiet border border-accent-line flex items-center justify-center text-xs font-bold text-accent-ink">
                        {ws.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-ink">{ws.name}</h4>
                        <p className="text-[10px] text-ink-3 font-mono">r/{ws.slug}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 shrink-0 mt-1" />
                  </div>
                  {ws.description && (
                    <p className="text-xs text-ink-3 line-clamp-2 leading-relaxed">
                      {ws.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-line-subtle text-[10px] text-ink-3 font-medium">
                  <span>A&apos;zolar: <strong className="text-ink-2">{ws._count?.members ?? 1}</strong></span>
                  <span>Saytlar: <strong className="text-ink-2">{ws._count?.websites ?? 0}</strong></span>
                  <span>Ulashlar: <strong className="text-ink-2">{ws._count?.connections ?? 0}</strong></span>
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
              <div className="w-5 h-5 border-2 border-line border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Tab selector */}
              <div className="flex border-b border-line gap-2">
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
                        ? 'border-accent-line text-accent-ink font-bold'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Members View */}
              {activeSubTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto divide-y divide-line">
                    {members.map((m) => {
                      const isSelf = m.userId === user?.id;
                      const isOwnerRole = m.role === 'OWNER';
                      return (
                        <div key={m.id} className="flex items-center justify-between py-2 gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-ink truncate">
                              {m.user.name || m.user.email} {isSelf && <span className="text-[10px] text-ink-3">(siz)</span>}
                            </p>
                            <p className="text-[10px] text-ink-3 truncate">{m.user.email}</p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {canManage && !isSelf && !isOwnerRole ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                                className="text-[10px] bg-surface border border-line rounded px-1.5 py-0.5 text-ink-2 outline-none"
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
                                onClick={() => setRemoveMember(m)}
                                className="p-1 text-ink-3 hover:text-negative-ink transition-colors"
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
                    <form onSubmit={handleSendInvite} className="flex gap-2 items-end bg-surface p-3 border border-line rounded-panel">
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
                        <label className="text-[10px] uppercase text-ink-3 block mb-1">Rol</label>
                        <select
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(
                              e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER',
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-control border border-line bg-surface text-ink outline-none"
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
                    <p className="text-[10px] uppercase text-ink-3 tracking-wider">Kutilayotgan takliflar</p>
                    {invites.length === 0 ? (
                      <p className="text-xs text-ink-3 py-2">Kutilayotgan takliflar mavjud emas</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-line">
                        {invites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between py-2 text-xs">
                            <div>
                              <p className="font-semibold text-ink-2">{inv.email}</p>
                              <p className="text-[9px] text-ink-3 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(inv.expiresAt).toLocaleDateString('uz-UZ')} gacha faol
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px]">{inv.role}</Badge>
                              {canManage && (
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  className="text-ink-3 hover:text-negative-ink p-1 transition-colors"
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
                    <h5 className="text-[10px] uppercase text-ink-3 tracking-wider mb-2 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-ink-3" />
                      Veb-saytlar ({wsWebsites.length})
                    </h5>
                    {wsWebsites.length === 0 ? (
                      <p className="text-xs text-ink-3">Jamoaga biriktirilgan saytlar yo&apos;q</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wsWebsites.map((site) => (
                          <div key={site.id} className="p-2.5 bg-surface border border-line rounded-control flex items-center justify-between gap-4">
                            <span className="text-xs font-medium text-ink-2">{site.name}</span>
                            <span className="text-[10px] font-mono text-ink-3">{site.domain || 'no-domain'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h5 className="text-[10px] uppercase text-ink-3 tracking-wider mb-2 flex items-center gap-1.5 mt-2">
                      <Link2 className="w-3 h-3 text-ink-3" />
                      Platformalar ({wsConnections.length})
                    </h5>
                    {wsConnections.length === 0 ? (
                      <p className="text-xs text-ink-3">Jamoaga biriktirilgan platformalar yo&apos;q</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wsConnections.map((conn) => (
                          <div key={conn.id} className="p-2.5 bg-surface border border-line rounded-control flex items-center justify-between gap-4">
                            <span className="text-xs font-medium text-ink-2">{conn.platform}</span>
                            <span className="text-[10px] text-ink-3">@{conn.platformUsername || 'username'}</span>
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
                        <label htmlFor="ws-desc-area" className="text-sm text-ink-2">Tavsif (ixtiyoriy)</label>
                        <textarea
                          id="ws-desc-area"
                          rows={3}
                          value={selectedWorkspace.description || ''}
                          onChange={(e) => setSelectedWorkspace({ ...selectedWorkspace, description: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-control border border-line bg-surface text-ink outline-none focus:border-line-strong"
                        />
                      </div>
                      <Button type="submit" loading={isSubmitting} className="self-start">
                        Saqlash
                      </Button>
                    </form>
                  ) : (
                    <div className="p-3 bg-surface border border-line rounded-panel flex gap-2.5 text-ink-3 text-xs items-start">
                      <Shield className="w-4 h-4 shrink-0 text-ink-3" />
                      <span>Jamoa sozlamalarini faqat OWNER yoki ADMIN o&apos;zgartira oladi.</span>
                    </div>
                  )}

                  {isOwner && (
                    <div className="pt-4 border-t border-negative-line mt-6 flex flex-col gap-3">
                      <div>
                        <h6 className="text-xs font-semibold text-negative-ink">Jamoani butunlay o&apos;chirish</h6>
                        <p className="text-[11px] text-ink-3 mt-0.5">Bu jamoani va unga tegishli barcha tahliliy resurslarni butunlay o&apos;chirib yuboradi. Amalni ortga qaytarib bo&apos;lmaydi.</p>
                      </div>
                      <Button type="button" variant="danger" className="self-start gap-1.5" onClick={() => setDeleteWsOpen(true)}>
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

      {/* Jamoani o'chirish — nomi yozib tasdiqlanadi, chunki jamoaga
          biriktirilgan barcha resurslar ham yo'qoladi. */}
      {deleteWsOpen && selectedWorkspace && (
        <ConfirmDialog
          title="Jamoani o'chirish"
          message={
            <>
              <strong className="text-ink">{selectedWorkspace.name}</strong>{' '}
              jamoasi butunlay o&apos;chiriladi. Bu amalni ortga qaytarib
              bo&apos;lmaydi.
            </>
          }
          consequence={`${selectedWorkspace._count?.members ?? 1} a'zo, ${selectedWorkspace._count?.websites ?? 0} sayt va ${selectedWorkspace._count?.connections ?? 0} ulanish jamoadan uziladi`}
          confirmText={selectedWorkspace.name}
          confirmLabel="Ha, jamoa o'chirilsin"
          loading={deletingWs}
          onConfirm={handleDeleteWorkspace}
          onClose={() => setDeleteWsOpen(false)}
        />
      )}

      {/* A'zoni chiqarish */}
      {removeMember && (
        <ConfirmDialog
          title="A'zoni jamoadan chiqarish"
          message={
            <>
              <strong className="text-ink">
                {removeMember.user.name || removeMember.user.email}
              </strong>{' '}
              jamoadan chiqariladi va jamoaning saytlari hamda ulanishlariga
              kirish huquqini yo&apos;qotadi.
            </>
          }
          confirmLabel="Ha, chiqarilsin"
          loading={removingMember}
          onConfirm={handleRemoveMember}
          onClose={() => setRemoveMember(null)}
        />
      )}

      {/* Create Workspace Modal */}
      {createOpen && (
        <Modal size="md" title="Yangi jamoa yaratish" onClose={() => setCreateOpen(false)}>
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
              <label htmlFor="ws-desc" className="text-sm text-ink-2">Tavsif (ixtiyoriy)</label>
              <textarea
                id="ws-desc"
                rows={3}
                placeholder="Agentlik mijozlari tahlillari va boshqaruv uchun jamoa..."
                value={wsDesc}
                onChange={(e) => setWsDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-control border border-line bg-surface text-ink outline-none focus:border-line-strong"
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
