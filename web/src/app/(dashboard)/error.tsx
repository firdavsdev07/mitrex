'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <div className="max-w-sm w-full text-center">
        <div className="w-10 h-10 mx-auto rounded-full bg-negative-quiet border border-negative-line flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5 text-negative-ink" />
        </div>
        <p className="text-sm font-medium text-ink mb-1">
          Nimadir xato ketdi
        </p>
        <p className="text-xs text-ink-3 mb-5">
          Sahifani yuklashda muammo yuz berdi. Qayta urinib ko&apos;ring.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium bg-surface-sunken text-ink border border-line hover:bg-surface-hover transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
