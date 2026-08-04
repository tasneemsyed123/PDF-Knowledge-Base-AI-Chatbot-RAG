import { Database, FileStack, Sigma } from 'lucide-react';
import type { VectorDbStats } from '@/types';

export function VectorDbPanel({ stats }: { stats: VectorDbStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1.5">
          <Sigma className="h-3.5 w-3.5" />
          <p className="text-2xs font-semibold uppercase tracking-wide">Total vectors</p>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalVectors.toLocaleString()}</p>
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1.5">
          <FileStack className="h-3.5 w-3.5" />
          <p className="text-2xs font-semibold uppercase tracking-wide">Indexed documents</p>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.indexedDocuments.toLocaleString()}</p>
      </div>

      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1.5">
          <Database className="h-3.5 w-3.5" />
          <p className="text-2xs font-semibold uppercase tracking-wide">Embedding model</p>
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={stats.embeddingModel ?? undefined}>
          {stats.embeddingModel ?? 'Unknown'}
        </p>
      </div>
    </div>
  );
}
