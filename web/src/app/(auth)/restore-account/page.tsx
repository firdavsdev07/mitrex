'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

type Status = 'loading' | 'success' | 'error';

function RestoreContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- qasddan: fetch-on-mount (token'ni tekshirib restore so'rovini yuborish), asosiy render tugagach ishlaydi
      setStatus('error');
      setMessage("Havola noto'g'ri — token topilmadi.");
      return;
    }
    apiClient
      .post<{ message: string }>('/users/restore', null, {
        params: { token },
      })
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message ?? 'Hisob muvaffaqiyatli tiklandi.');
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        setStatus('error');
        setMessage(
          msg ?? "Havola muddati o'tgan yoki noto'g'ri. Qo'llab-quvvatlash bilan bog'laning.",
        );
      });
  }, [token]);

  return (
    <div className="w-full max-w-sm text-center">
      <div className="rounded-panel border border-line bg-surface p-6">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-ink-3" />
            <p className="text-sm text-ink-2">Hisobingiz tiklanmoqda...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-positive-ink" />
            <h1 className="mb-1 text-lg font-semibold text-ink">
              Hisob tiklandi
            </h1>
            <p className="mb-5 text-sm text-ink-3">{message}</p>
            <Link
              href="/login"
              className="inline-block rounded-control bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-hover"
            >
              Kirish
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-8 w-8 text-negative-ink" />
            <h1 className="mb-1 text-lg font-semibold text-ink">
              Tiklab bo&apos;lmadi
            </h1>
            <p className="mb-5 text-sm text-ink-3">{message}</p>
            <Link
              href="/login"
              className="text-sm text-ink-2 hover:text-ink"
            >
              Kirish sahifasiga qaytish
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function RestoreAccountPage() {
  return (
    <Suspense>
      <RestoreContent />
    </Suspense>
  );
}
