'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';

const schema = z.object({
  email: z.string().min(1, 'Email kiriting'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await authApi.forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setServerError(msg ?? 'Xat yuborishda xatolik yuz berdi');
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-100 mb-2">
          Xat yuborildi
        </h1>
        <p className="text-sm text-zinc-500 mb-1">
          Parolni tiklash havolasi quyidagi emailga yuborildi:
        </p>
        <p className="text-sm text-zinc-300 font-medium mb-6">{sentEmail}</p>
        <p className="text-xs text-zinc-600 mb-6">
          Xat kelmasa spam papkasini tekshiring. Havola 1 soat davomida amal
          qiladi.
        </p>
        <Link
          href="/login"
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kirish sahifasiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <h1 className="text-xl font-semibold text-zinc-100 mb-1">
          Parolni tiklash
        </h1>
        <p className="text-sm text-zinc-500">
          Email manzilingizni kiriting, havola yuboramiz
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="siz@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          {serverError && (
            <p className="text-sm text-red-400 -mt-1">{serverError}</p>
          )}

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-1"
          >
            Havola yuborish
          </Button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-zinc-600">
        <Link
          href="/login"
          className="text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kirish sahifasiga qaytish
        </Link>
      </p>
    </div>
  );
}
