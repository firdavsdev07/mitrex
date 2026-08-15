import { apiClient } from './client';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix?: string;
  key?: string; // only returned once on creation
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const apiKeysApi = {
  list: () => apiClient.get<ApiKey[]>('/api-keys').then((r) => r.data),

  create: (name: string, expiresInDays?: number) =>
    apiClient
      .post<ApiKey>('/api-keys', { name, expiresInDays })
      .then((r) => r.data),

  revoke: (id: string) =>
    apiClient.delete<{ revoked: boolean }>(`/api-keys/${id}`).then((r) => r.data),
};
