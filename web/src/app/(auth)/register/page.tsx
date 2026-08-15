'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import { loginAndStore } from '@/store/auth';
import { billingApi } from '@/lib/api/billing';

const schema = z.object({
  name: z.string().min(1, 'Ismingizni kiriting'),
  email: z.string().email("Noto'g'ri email format"),
  password: z.string().min(8, "Parol kamida 8 ta belgi bo'lishi kerak"),
});
type FormData = z.infer<typeof schema>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function RegisterPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await authApi.register(data);
      loginAndStore(res.accessToken, res.user);

      const plan = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('plan') : null;
      if (plan && plan !== 'free') {
        try {
          const checkoutRes = await billingApi.checkout(plan);
          if (checkoutRes.checkoutUrl) {
            window.location.assign(checkoutRes.checkoutUrl);
            return;
          }
        } catch (checkoutErr) {
          console.error("Auto checkout error:", checkoutErr);
          router.push('/settings?billing=true');
          return;
        }
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(msg ?? "Ro'yxatdan o'tishda xatolik");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">
          Hisob yaratish
        </h1>
        <p className="text-sm text-zinc-500">
          Bepul boshlang, karta kerak emas
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        {/* Social */}
        <div className="flex flex-col gap-2 mb-5">
          <a
            href={`${API_BASE}/auth/google`}
            className="flex items-center justify-center gap-2.5 w-full py-2 text-sm text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <GoogleIcon />
            Google bilan ro&apos;yxatdan o&apos;tish
          </a>
          <a
            href={`${API_BASE}/auth/github`}
            className="flex items-center justify-center gap-2.5 w-full py-2 text-sm text-zinc-300 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <GithubIcon />
            GitHub bilan ro&apos;yxatdan o&apos;tish
          </a>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">yoki email bilan</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Ism"
            type="text"
            autoComplete="name"
            placeholder="Firdavs"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="siz@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-zinc-300">
              Parol
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Kamida 8 ta belgi"
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 text-sm rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/20"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={
                  showPwd ? 'Parolni yashirish' : "Parolni ko'rsatish"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-1"
          >
            Hisob yaratish
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-zinc-600">
        Hisob bormi?{' '}
        <Link
          href="/login"
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Kirish
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-zinc-700">
        Ro&apos;yxatdan o&apos;tish orqali siz{' '}
        <Link
          href="/terms"
          className="underline underline-offset-2 hover:text-zinc-500"
        >
          Foydalanish shartlari
        </Link>{' '}
        va{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-zinc-500"
        >
          Maxfiylik siyosati
        </Link>
        ga rozilik bildirasiz.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
