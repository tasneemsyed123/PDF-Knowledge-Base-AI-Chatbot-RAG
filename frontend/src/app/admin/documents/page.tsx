'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Trash2, Search, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { UploadPdfModal } from '@/components/admin/UploadPdfModal';
import { DocumentStatusBadge } from '@/components/admin/DocumentStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { DocumentRecord } from '@/types';

export default function AdminDocumentsPage() {
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
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

  // Drop any selected ids that no longer exist in the current result set
  // (e.g. after a search, a delete, or another tab removing a document).
  useEffect(() => {
    if (!data) return;
    const validIds = new Set(data.items.map((d) => d._id));
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // The bulk-delete confirm step only makes sense while something is
  // selected - without this, deselecting everything after starting a
  // confirm (or a delete completing and clearing the selection) leaves it
  // primed to fire again the next time anything is selected.
  useEffect(() => {
    if (selected.size === 0) setConfirmBulkDelete(false);
  }, [selected.size]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents'] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/documents/${id}`),
    onSuccess: invalidate,
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => apiClient.delete(`/admin/documents/${id}`)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { failed, total: ids.length };
    },
    onSuccess: ({ failed, total }) => {
      invalidate();
      setSelected(new Set());
      setActionError(failed > 0 ? `Deleted ${total - failed} of ${total} documents - ${failed} failed.` : null);
    },
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/documents/${id}/reprocess`),
    onSuccess: invalidate,
    onError: (err) => setActionError(getApiErrorMessage(err)),
  });

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((d) => d._id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Knowledge Base Documents</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" /> Upload PDF
        </Button>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Dismiss" className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto animate-fadeIn">
                {confirmBulkDelete ? (
                  <>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      Delete {selected.size} document{selected.size > 1 ? 's' : ''}?
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setConfirmBulkDelete(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={bulkDeleteMutation.isPending}
                      onClick={() => {
                        bulkDeleteMutation.mutate(Array.from(selected));
                        setConfirmBulkDelete(false);
                      }}
                    >
                      {bulkDeleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmBulkDelete(true)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete selected
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {isError ? (
            <div className="py-10 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{getApiErrorMessage(error)}</p>
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
          ) : items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all documents"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-blue-600 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>File name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((doc) => (
                  <TableRow key={doc._id} className={cn(selected.has(doc._id) && 'bg-blue-50/60 dark:bg-blue-500/10')}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${doc.originalName}`}
                        checked={selected.has(doc._id)}
                        onChange={() => toggleOne(doc._id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-blue-600 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{doc.originalName}</TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={doc.status} />
                      {doc.status === 'failed' && doc.errorMessage && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs truncate" title={doc.errorMessage}>
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
                      {confirmDeleteId === doc._id ? (
                        <div className="flex items-center justify-end gap-2 animate-fadeIn">
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium hidden sm:inline">Delete?</span>
                          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              deleteMutation.mutate(doc._id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
                          </Button>
                        </div>
                      ) : (
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
                            onClick={() => setConfirmDeleteId(doc._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
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
