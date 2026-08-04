'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';

const CONFIRM_PHRASE = 'RESET';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ data: { documentsDeleted: number } }>('/admin/reset/all');
      return data.data;
    },
    onSuccess: ({ documentsDeleted }) => {
      setResult(
        `Reset complete - deleted ${documentsDeleted} document${documentsDeleted === 1 ? '' : 's'} and all chat history.`,
      );
      setError(null);
      setConfirmOpen(false);
      setConfirmText('');
      // Every admin query depends on data this just wiped - dashboard
      // stats, the documents list, monitoring counters all need a refetch.
      queryClient.invalidateQueries();
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <AdminShell>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-6">Settings</h1>

      <Card className="border-red-200 dark:border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently deletes every uploaded document (files and vectors), all chat history, and the API usage
            counters. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
              {result}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {!confirmOpen ? (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Reset everything
            </Button>
          ) : (
            <div className="space-y-3 animate-confirmPop max-w-sm">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Type <span className="font-mono font-bold">RESET</span> to confirm. This deletes all documents,
                vectors, and chat history - it cannot be undone.
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type RESET"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmOpen(false);
                    setConfirmText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== CONFIRM_PHRASE || resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                >
                  {resetMutation.isPending ? 'Resetting…' : 'Confirm reset'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
