'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { setToken } from '@/lib/api/client';
import { loginAndStore } from '@/store/auth';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Scrub the token out of the visible URL/history entry immediately —
    // it's already been read into memory, no need to keep it in the address
    // bar (browser history, any outgoing Referer) a moment longer than needed.
    window.history.replaceState({}, '', '/auth/callback');

    // OAuth callback'da server allaqachon httpOnly refresh cookie'ni
    // o'rnatgan (redirect javobi orqali) — bu yerda faqat qisqa muddatli
    // access tokenni xotiraga yozamiz.
    setToken(token);
    authApi
      .me()
      .then((user) => {
        loginAndStore(token, user);
        router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [params, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="w-6 h-6 animate-spin text-orange-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm text-zinc-500">Kirmoqda...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
