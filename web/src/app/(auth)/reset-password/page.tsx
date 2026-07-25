'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';

const schema = z
  .object({
    password: z.string().min(8, 'Kamida 8 ta belgi'),
    confirm: z.string().min(1, 'Parolni tasdiqlang'),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Parollar mos kelmadi',
    path: ['confirm'],
  });
type FormData = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
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
      await authApi.resetPassword({ token, password: data.password });
      router.push('/login?reset=1');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(
        msg ?? "Xatolik yuz berdi. Havola muddati o'tgan bo'lishi mumkin.",
      );
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-sm text-red-400">
          Noto&apos;g&apos;ri havola. Iltimos parolni tiklash sahifasidan qayta
          urinib ko&apos;ring.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-200"
        >
          Parolni tiklash
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">
          Yangi parol
        </h1>
        <p className="text-sm text-zinc-500">Yangi parolingizni kiriting</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="text-sm text-zinc-300">
              Yangi parol
            </label>
            <div className="relative">
              <input
                id="new-password"
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="text-sm text-zinc-300">
              Parolni tasdiqlang
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Parolni qayta kiriting"
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600/20"
              {...register('confirm')}
            />
            {errors.confirm && (
              <p className="text-xs text-red-400">{errors.confirm.message}</p>
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
            Parolni yangilash
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
