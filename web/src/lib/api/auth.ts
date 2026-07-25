import { apiClient } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN';
  avatar?: string | null;
  provider?: string;
  twoFactorEnabled?: boolean;
  weeklyDigest?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  tempToken: string;
}

export interface LoginEvent {
  id: string;
  provider: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient
      .post<AuthResponse | TwoFactorRequiredResponse>('/auth/login', data)
      .then((r) => r.data),

  verifyTwoFactor: (data: { tempToken: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/2fa/verify', data).then((r) => r.data),

  me: () => apiClient.get<AuthUser>('/auth/me').then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data),

  logoutAll: () => apiClient.post('/auth/logout-all').then((r) => r.data),

  loginHistory: () =>
    apiClient.get<LoginEvent[]>('/auth/login-history').then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; password: string }) =>
    apiClient.post('/auth/reset-password', data).then((r) => r.data),

  // ─── 2FA management ───────────────────────────────────────────────────

  setup2FA: () =>
    apiClient
      .post<{ secret: string; qrDataUrl: string }>('/auth/2fa/setup')
      .then((r) => r.data),

  confirm2FA: (code: string) =>
    apiClient
      .post<{ enabled: true }>('/auth/2fa/confirm', { code })
      .then((r) => r.data),

  disable2FA: (password: string) =>
    apiClient
      .post<{ disabled: true }>('/auth/2fa/disable', { password })
      .then((r) => r.data),
};

export function isTwoFactorRequired(
  res: AuthResponse | TwoFactorRequiredResponse,
): res is TwoFactorRequiredResponse {
  return 'twoFactorRequired' in res;
}
