import { apiClient } from './client';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'error';
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiClient
      .get<Notification[]>('/notifications', {
        params: unreadOnly ? { unread: true } : {},
      })
      .then((r) => r.data),

  count: () =>
    apiClient
      .get<{ count: number }>('/notifications/count')
      .then((r) => r.data),

  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.patch('/notifications/read-all').then((r) => r.data),
};
