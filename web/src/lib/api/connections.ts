import { apiClient } from './client';

export interface Connection {
  id: string;
  platform: string;
  platformUsername: string | null;
  isActive: boolean;
  tokenStatus: 'ok' | 'expiring_soon' | 'expired';
  createdAt: string;
  stats: {
    followers: number | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    engagement: number | null;
    date: string;
    updatedAt: string;
  }[];
}

export const connectionsApi = {
  list: () => apiClient.get<Connection[]>('/connections').then((r) => r.data),

  disconnect: (connectionId: string) =>
    apiClient.delete(`/connections/${connectionId}`).then((r) => r.data),

  syncOne: (connectionId: string) =>
    apiClient.post(`/connections/${connectionId}/sync`).then((r) => r.data),

  // OAuth URL olish (JWT bilan) — keyin window.location.href ga yo'naltirish
  getOAuthUrl: (endpoint: string) =>
    apiClient.get<{ url: string }>(endpoint).then((r) => r.data.url),

  connectYoutube: (handle: string) =>
    apiClient.post('/youtube/connect', { handle }).then((r) => r.data),

  connectBluesky: (data: { handle: string; appPassword: string }) =>
    apiClient.post('/bluesky/connect', data).then((r) => r.data),

  connectTelegram: (channel: string) =>
    apiClient.post('/telegram/connect', { channel }).then((r) => r.data),

  connectReddit: (subreddit: string) =>
    apiClient.post('/reddit/connect', { subreddit }).then((r) => r.data),
};

export const PLATFORM_META: Record<
  string,
  {
    label: string;
    color: string;
    connectType:
      | 'oauth'
      | 'youtube'
      | 'bluesky'
      | 'telegram'
      | 'telegram_handle'
      | 'reddit'
      | 'manual';
  }
> = {
  YOUTUBE: { label: 'YouTube', color: 'text-red-400', connectType: 'youtube' },
  TELEGRAM: {
    label: 'Telegram',
    color: 'text-blue-400',
    connectType: 'telegram_handle',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: 'text-pink-400',
    connectType: 'oauth',
  },
  DISCORD: { label: 'Discord', color: 'text-indigo-400', connectType: 'oauth' },
  BLUESKY: { label: 'Bluesky', color: 'text-sky-400', connectType: 'bluesky' },
  FACEBOOK: { label: 'Facebook', color: 'text-blue-500', connectType: 'oauth' },
  REDDIT: { label: 'Reddit', color: 'text-orange-500', connectType: 'reddit' },
};
