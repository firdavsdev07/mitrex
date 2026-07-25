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
        <div className="w-10 h-10 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-sm font-medium text-zinc-200 mb-1">
          Nimadir xato ketdi
        </p>
        <p className="text-xs text-zinc-500 mb-5">
          Sahifani yuklashda muammo yuz berdi. Qayta urinib ko&apos;ring.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-200 border border-zinc-700 hover:bg-zinc-800 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
