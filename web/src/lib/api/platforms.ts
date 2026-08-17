import { apiClient } from './client';

export interface PlatformConfig {
  slug: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  enabled: boolean;
  comingSoon: boolean;
  connected: boolean;
  connectedAs: string | null;
}

export const platformsApi = {
  list: () => apiClient.get<PlatformConfig[]>('/platforms').then((r) => r.data),
};
