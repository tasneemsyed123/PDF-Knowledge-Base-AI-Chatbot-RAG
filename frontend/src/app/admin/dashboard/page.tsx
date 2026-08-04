'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MessagesSquare, HelpCircle, Upload, ArrowUpRight } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { StatCard } from '@/components/admin/StatCard';
import { DocumentStatusBadge } from '@/components/admin/DocumentStatusBadge';
import { UploadPdfModal } from '@/components/admin/UploadPdfModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import type { DashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const { admin } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: DashboardStats }>('/admin/dashboard/stats');
      return data.data;
    },
    refetchInterval: 15_000,
  });

  const firstName = admin?.name?.split(' ')[0];

  return (
    <AdminShell>
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-7 sm:px-8 sm:py-9 mb-8 shadow-lg shadow-blue-900/10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Welcome back{firstName ? `, ${firstName}` : ''}</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">Dashboard</h1>
            <p className="text-blue-100/90 text-sm mt-1.5 max-w-md">
              A snapshot of your knowledge base and chatbot activity.
            </p>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-white text-blue-700 hover:bg-blue-50 shadow-md"
            size="lg"
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between gap-4">
          <span>{getApiErrorMessage(error)}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Uploaded PDFs" value={data?.totalDocuments ?? 0} icon={FileText} accent="blue" />
          <StatCard label="Total Chat Sessions" value={data?.totalChatSessions ?? 0} icon={MessagesSquare} accent="violet" />
          <StatCard label="Total Questions Asked" value={data?.totalQuestionsAsked ?? 0} icon={HelpCircle} accent="emerald" />
        </div>
      )}

      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recently Uploaded Documents</CardTitle>
          <a
            href="/admin/documents"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            View all
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="text-sm text-red-600 py-6 text-center">Could not load recent documents.</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : data?.recentDocuments.length ? (
            <ul className="divide-y divide-border">
              {data.recentDocuments.map((doc) => (
                <li key={doc._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.uploadDate).toLocaleString()}</p>
                    </div>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground mb-3">No documents uploaded yet.</p>
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Upload your first PDF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadPdfModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['documents'] });
        }}
      />
    </AdminShell>
  );
}
