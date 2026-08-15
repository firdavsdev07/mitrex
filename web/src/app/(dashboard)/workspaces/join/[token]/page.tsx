'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { workspacesApi } from '@/lib/api/workspaces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useWorkspaceStore } from '@/store/workspace';

export default function WorkspaceJoinPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await workspacesApi.acceptInvite(token);
      setSuccess(true);
      
      // Refresh workspaces store
      const list = await workspacesApi.list().catch(() => []);
      setWorkspaces(list);
      
      // Auto-set the new workspace as active!
      const active = list.find((w) => w.id === res.workspaceId) || null;
      setActiveWorkspace(active);

      setTimeout(() => {
        router.push('/workspaces');
      }, 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Taklifnomani qabul qilishda xatolik yuz berdi. Balki taklif muddati tugagan yoki taklif boshqa elektron pochtaga yuborilgan bo'lishi mumkin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="border-line bg-canvas backdrop-blur-md">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded-full bg-accent-quiet border border-accent-line flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-accent-ink" />
          </div>
          <CardTitle className="text-lg font-bold text-ink">Jamoaga qo&apos;shilish</CardTitle>
          <CardDescription className="text-xs text-ink-3">
            Siz jamoa a&apos;zoligiga taklif qilindingiz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="flex flex-col items-center text-center p-4 bg-positive-quiet border border-positive-line rounded-panel gap-2 text-positive-ink">
              <CheckCircle className="w-8 h-8" />
              <p className="text-sm font-semibold">Muvaffaqiyatli a&apos;zo bo&apos;ldingiz!</p>
              <p className="text-xs text-ink-3">Jamoalar sahifasiga yo&apos;naltirilmoqdasiz...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex gap-2.5 bg-negative-quiet border border-negative-line rounded-panel p-3 text-negative-ink text-xs items-start">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-negative-ink" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-xs text-ink-2 text-center leading-relaxed">
                Ushbu jamoaga qo&apos;shilish orqali siz loyihaning barcha umumiy saytlari va platformalar ko&apos;rsatkichlarini ko&apos;rish va o&apos;z rolingizga mos ravishda boshqarish huquqiga ega bo&apos;lasiz.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleAccept}
                  loading={loading}
                  className="w-full justify-center"
                >
                  Taklifni qabul qilish
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/dashboard')}
                  className="w-full justify-center gap-1.5"
                  disabled={loading}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Rad etish va boshqaruv paneliga qaytish
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
