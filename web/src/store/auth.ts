import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setToken, removeToken } from "@/lib/api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
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
      name: "metrix-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export function loginAndStore(token: string, user: User) {
  setToken(token);
  useAuthStore.getState().setUser(user);
}
