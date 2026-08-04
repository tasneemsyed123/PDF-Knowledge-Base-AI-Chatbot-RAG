import { AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LlmUsageStats } from '@/types';

export function LlmUsagePanel({ usage }: { usage: LlmUsageStats }) {
  const pct = usage.dailyLimit ? Math.min(100, Math.round((usage.callsToday / usage.dailyLimit) * 100)) : null;
  const barColor =
    pct === null ? 'bg-blue-500' : pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  const providers = Object.entries(usage.byProvider);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-end justify-between mb-1.5">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            Calls today
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{usage.callsToday}</span>
            {usage.dailyLimit ? ` / ${usage.dailyLimit}` : ''}
          </p>
        </div>

        {usage.dailyLimit ? (
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No daily limit configured.</p>
        )}

        {pct !== null && pct >= 90 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pct >= 100 ? 'Daily limit reached.' : 'Approaching the configured daily limit.'}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-2xs text-muted-foreground uppercase tracking-wide font-semibold">Total calls (all-time)</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{usage.totalCalls}</p>
        </div>

        {providers.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {providers.map(([provider, count]) => (
              <span
                key={provider}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 capitalize"
              >
                {provider}
                <span className="text-slate-400">·</span>
                {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
