'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { LlmUsagePanel } from '@/components/admin/LlmUsagePanel';
import { VectorDbPanel } from '@/components/admin/VectorDbPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import type { MonitoringStats } from '@/types';

export default function AdminMonitoringPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['monitoring-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: MonitoringStats }>('/admin/monitoring/stats');
      return data.data;
    },
    refetchInterval: 15_000,
  });

  return (
    <AdminShell>
      <div className="flex items-center gap-2.5 mb-6">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">API Monitoring</h1>
          <p className="text-sm text-muted-foreground">LLM call volume and vector database health</p>
        </div>
      </div>

      {isError ? (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{getApiErrorMessage(error)}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle>LLM API Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-16" /> : data ? <LlmUsagePanel usage={data.llmUsage} /> : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle>Vector Database</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-24" /> : data ? <VectorDbPanel stats={data.vectorDb} /> : null}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
