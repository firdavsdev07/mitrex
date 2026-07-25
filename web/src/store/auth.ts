import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setToken, removeToken } from '@/lib/api/client';
import type { AuthUser } from '@/lib/api/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      logout: () => {
        removeToken();
        set({ user: null });
      },
      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'metrix-auth',
      // Faqat profil ma'lumoti persist qilinadi — access token endi
      // localStorage/cookie'da saqlanmaydi (client.ts'dagi xotiradagi
      // o'zgaruvchida turadi, refresh cookie orqali qayta tiklanadi).
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export function loginAndStore(accessToken: string, user: AuthUser) {
  setToken(accessToken);
  useAuthStore.getState().setUser(user);
}
