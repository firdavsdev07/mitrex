'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi, isTwoFactorRequired } from '@/lib/api/auth';
import { loginAndStore } from '@/store/auth';

const schema = z.object({
  email: z.string().email("Noto'g'ri email format"),
  password: z.string().min(1, 'Parol kiriting'),
});
type FormData = z.infer<typeof schema>;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function LoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function goToDashboard(role: string) {
    router.push(role === 'ADMIN' ? '/admin' : '/dashboard');
  }

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await authApi.login(data);
      if (isTwoFactorRequired(res)) {
        setTempToken(res.tempToken);
        return;
      }
      loginAndStore(res.accessToken, res.user);
      goToDashboard(res.user.role);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(msg ?? "Email yoki parol noto'g'ri");
    }
  }

  async function onVerifyTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken || code.length < 6) return;
    setServerError('');
    setVerifying(true);
    try {
      const res = await authApi.verifyTwoFactor({ tempToken, code });
      loginAndStore(res.accessToken, res.user);
      goToDashboard(res.user.role);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(msg ?? "Noto'g'ri kod");
    } finally {
      setVerifying(false);
    }
  }

  if (tempToken) {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <div className="w-10 h-10 rounded-panel bg-accent-quiet border border-accent-line flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-5 h-5 text-accent-ink" />
          </div>
          <h1 className="text-xl font-semibold text-ink mb-1">
            Ikki bosqichli tekshiruv
          </h1>
          <p className="text-sm text-ink-3">
            Autentifikator ilovangizdagi 6 xonali kodni kiriting
          </p>
        </div>

        <div className="rounded-panel border border-line bg-surface p-6">
          <form onSubmit={onVerifyTwoFactor} className="flex flex-col gap-4">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-3 text-center text-lg tracking-[0.5em] rounded-control border border-line bg-surface text-ink placeholder:text-ink-faint outline-none transition-all focus:border-line-strong focus:ring-1 focus:ring-line-strong"
            />
            {serverError && (
              <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              loading={verifying}
              className="w-full"
            >
              Tasdiqlash
            </Button>
            <button
              type="button"
              onClick={() => {
                setTempToken(null);
                setCode('');
                setServerError('');
              }}
              className="text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Orqaga
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold text-ink mb-1">
          Xush kelibsiz
        </h1>
        <p className="text-sm text-ink-3">Hisobingizga kiring</p>
      </div>

      <div className="rounded-panel border border-line bg-surface p-6">
        {/* Social logins */}
        <div className="flex flex-col gap-2 mb-5">
          <a
            href={`${API_BASE}/auth/google`}
            className="flex h-12 items-center justify-center gap-2.5 w-full text-body font-medium text-ink border border-line rounded-control hover:bg-surface-hover transition-colors ease-standard duration-[var(--mx-dur-micro)]"
          >
            <GoogleIcon />
            Google bilan kirish
          </a>
          <a
            href={`${API_BASE}/auth/github`}
            className="flex h-12 items-center justify-center gap-2.5 w-full text-body font-medium text-ink border border-line rounded-control hover:bg-surface-hover transition-colors ease-standard duration-[var(--mx-dur-micro)]"
          >
            <GithubIcon />
            GitHub bilan kirish
          </a>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-surface-sunken" />
          <span className="text-xs text-ink-3">yoki email bilan</span>
          <div className="flex-1 h-px bg-surface-sunken" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="siz@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm text-ink-2">
                Parol
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-ink-3 hover:text-ink transition-colors"
              >
                Parolni unutdingizmi?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                // Input primitivi bilan AYNAN bir xil: `h-10`,
                // `bg-surface-sunken`, `rounded-control`. Ilgari bu maydon
                // qo'lda yozilgani uchun email maydonidan boshqacha radius va
                // boshqacha fon bilan chiqardi — bitta formada, 16px masofada.
                className="w-full h-10 px-3 pr-10 text-body rounded-control border border-line bg-surface-sunken text-ink placeholder:text-ink-faint outline-none transition-colors ease-standard duration-[var(--mx-dur-micro)] focus:border-line-strong focus:ring-1 focus:ring-line-strong"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={
                  showPwd ? 'Parolni yashirish' : "Parolni ko'rsatish"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors"
              >
                {showPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-negative-ink">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-negative-ink bg-negative-quiet border border-negative-line rounded-control px-3 py-2">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-1"
          >
            Kirish
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-ink-3">
        Hisob yo&apos;qmi?{' '}
        <Link
          href="/register"
          className="text-ink-2 hover:text-ink transition-colors"
        >
          Ro&apos;yxatdan o&apos;tish
        </Link>
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
