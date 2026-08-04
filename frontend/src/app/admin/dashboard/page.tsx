'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, MessagesSquare, HelpCircle } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { StatCard } from '@/components/admin/StatCard';
import { DocumentStatusBadge } from '@/components/admin/DocumentStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import type { DashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: DashboardStats }>('/admin/dashboard/stats');
      return data.data;
    },
    refetchInterval: 15_000,
  });

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>

      {isError ? (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4">
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
          <StatCard label="Total Uploaded PDFs" value={data?.totalDocuments ?? 0} icon={FileText} />
          <StatCard label="Total Chat Sessions" value={data?.totalChatSessions ?? 0} icon={MessagesSquare} />
          <StatCard label="Total Questions Asked" value={data?.totalQuestionsAsked ?? 0} icon={HelpCircle} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recently Uploaded Documents</CardTitle>
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
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.originalName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(doc.uploadDate).toLocaleString()}</p>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
