'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Trash2, Search } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { UploadPdfModal } from '@/components/admin/UploadPdfModal';
import { DocumentStatusBadge } from '@/components/admin/DocumentStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import type { DocumentRecord } from '@/types';

export default function AdminDocumentsPage() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents', search],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { items: DocumentRecord[]; total: number } }>('/admin/documents', {
        params: { search: search || undefined },
      });
      return data.data;
    },
    // Poll while anything is still processing so status flips update live.
    refetchInterval: (query) => (query.state.data?.items.some((d) => d.status === 'processing') ? 3000 : false),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents'] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/documents/${id}`),
    onSuccess: invalidate,
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/documents/${id}/reprocess`),
    onSuccess: invalidate,
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Knowledge Base Documents</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload PDF
        </Button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">{actionError}</div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by file name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-600 mb-3">{getApiErrorMessage(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data?.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((doc) => (
                  <TableRow key={doc._id}>
                    <TableCell className="font-medium max-w-xs truncate">{doc.originalName}</TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={doc.status} />
                      {doc.status === 'failed' && doc.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={doc.errorMessage}>
                          {doc.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{doc.pageCount ?? '—'}</TableCell>
                    <TableCell>{doc.chunkCount ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Reprocess"
                          disabled={reprocessMutation.isPending || doc.status === 'processing'}
                          onClick={() => reprocessMutation.mutate(doc._id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete "${doc.originalName}"? This removes it from the knowledge base.`)) {
                              deleteMutation.mutate(doc._id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">
              {search ? 'No documents match your search.' : 'No documents uploaded yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <UploadPdfModal open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={invalidate} />
    </AdminShell>
  );
}
