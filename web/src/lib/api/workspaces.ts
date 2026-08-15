import { apiClient } from './client';
import type { Website } from './websites';
import type { Connection } from './connections';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  token: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[];
  invites?: WorkspaceInvite[];
  _count?: {
    members: number;
    websites: number;
    connections: number;
  };
}

export const workspacesApi = {
  list: () => apiClient.get<Workspace[]>('/workspaces').then((r) => r.data),

  get: (id: string) => apiClient.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),

  create: (dto: { name: string; slug: string; description?: string }) =>
    apiClient.post<Workspace>('/workspaces', dto).then((r) => r.data),

  update: (id: string, dto: { name?: string; slug?: string; description?: string }) =>
    apiClient.patch<Workspace>(`/workspaces/${id}`, dto).then((r) => r.data),

  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/workspaces/${id}`).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient.get<WorkspaceMember[]>(`/workspaces/${id}/members`).then((r) => r.data),

  updateMemberRole: (id: string, memberId: string, role: string) =>
    apiClient
      .patch<{ success: boolean }>(`/workspaces/${id}/members/${memberId}`, { role })
      .then((r) => r.data),

  removeMember: (id: string, memberId: string) =>
    apiClient.delete<{ success: boolean }>(`/workspaces/${id}/members/${memberId}`).then((r) => r.data),

  invite: (id: string, dto: { email: string; role: string }) =>
    apiClient.post<{ invited: boolean; email: string; expiresAt: string }>(`/workspaces/${id}/invites`, dto).then((r) => r.data),

  getInvites: (id: string) =>
    apiClient.get<WorkspaceInvite[]>(`/workspaces/${id}/invites`).then((r) => r.data),

  revokeInvite: (id: string, inviteId: string) =>
    apiClient.delete<{ revoked: boolean }>(`/workspaces/${id}/invites/${inviteId}`).then((r) => r.data),

  acceptInvite: (token: string) =>
    apiClient.post<{ joined: boolean; workspaceId: string; role: string }>(`/workspaces/join/${token}`).then((r) => r.data),

  getWebsites: (id: string) =>
    apiClient.get<Website[]>(`/workspaces/${id}/websites`).then((r) => r.data),

  getConnections: (id: string) =>
    apiClient
      .get<Connection[]>(`/workspaces/${id}/connections`)
      .then((r) => r.data),
};
