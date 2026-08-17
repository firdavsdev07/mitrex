import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// Access token endi faqat xotirada saqlanadi (JS o'qiy oladigan cookie'da
// EMAS) — XSS bo'lsa ham uni o'g'irlab bo'lmaydi. Sessiya uzayishi uchun
// server httpOnly refresh-token cookie o'rnatadi (/auth ostida, faqat
// serverga yuboriladi); shu cookie orqali /auth/refresh yangi access token
// beradi. Sahifa qayta yuklanganda accessToken yo'qoladi — shuning uchun
// bootstrapSession() ilova ochilganda chaqiriladi.
let accessToken: string | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

const NO_REFRESH_RETRY = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/2fa/verify',
];

// Sahifalar — bu yerlarda 401 kelsa (masalan forma yuborilayotganda sessiya
// allaqachon tugagan bo'lsa) hard-redirect qilinmaydi, aks holda foydalanuvchi
// hali to'ldirayotgan forma holati (masalan reset-password token) yo'qoladi.
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/restore-account'];

let refreshPromise: Promise<string | null> | null = null;

// Bir vaqtning o'zida bir nechta so'rov 401 qaytarsa ham, refresh faqat bitta
// marta chaqiriladi — refresh token bir martalik (rotating) bo'lgani uchun
// parallel chaqiruvlar bir-birini "reuse detected" holatiga olib kelib,
// butun sessiyani yopib qo'yishi mumkin edi.
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(`${API_BASE}/auth/refresh`, null, {
        withCredentials: true,
      })
      .then((res) => {
        accessToken = res.data.accessToken;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const url: string = config?.url ?? '';
    const skipRefresh = NO_REFRESH_RETRY.some((p) => url.startsWith(p));

    if (error.response?.status === 401 && !skipRefresh && !config._retried) {
      config._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      }
      // Refresh ham muvaffaqiyatsiz — sessiya haqiqatan tugagan
      accessToken = null;
      if (
        typeof window !== 'undefined' &&
        !PUBLIC_ROUTES.some((p) => window.location.pathname.startsWith(p))
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function setToken(token: string) {
  accessToken = token;
}

export function removeToken() {
  accessToken = null;
}

export function getToken() {
  return accessToken;
}

// Ilova ochilganda (yoki hard reload'da) refresh cookie orqali sessiyani
// tiklashga urinadi. true qaytsa — accessToken tayyor, /auth/me chaqirish mumkin.
export async function bootstrapSession(): Promise<boolean> {
  const token = await refreshAccessToken();
  return !!token;
}

export async function logoutSession() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // baribir lokal holatni tozalaymiz
  }
  accessToken = null;
}
