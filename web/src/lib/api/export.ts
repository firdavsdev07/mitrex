import { apiClient } from './client';

export const exportApi = {
  exportWebsitePageviews: async (id: string, period: 'week' | 'month' | 'all') => {
    const response = await apiClient.get(`/export/websites/${id}/pageviews`, {
      params: { period },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  exportPlatformStats: async (connectionId: string) => {
    const response = await apiClient.get(`/export/connections/${connectionId}/stats`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  exportPosts: async (connectionId: string) => {
    const response = await apiClient.get(`/export/connections/${connectionId}/posts`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  exportMyData: async () => {
    const response = await apiClient.get('/export/my-data', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
