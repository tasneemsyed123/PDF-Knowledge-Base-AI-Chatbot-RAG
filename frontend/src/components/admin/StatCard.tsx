import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const ACCENTS = {
  blue: 'from-blue-500 to-indigo-600',
  violet: 'from-violet-500 to-purple-600',
  emerald: 'from-emerald-500 to-teal-600',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: keyof typeof ACCENTS;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'animate-fadeIn overflow-hidden border-slate-200/80 dark:border-slate-800 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 dark:hover:shadow-none',
        className,
      )}
    >
      <div className={cn('h-1 bg-gradient-to-r', ACCENTS[accent])} />
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold tracking-tight mt-1.5 text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={cn('h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm', ACCENTS[accent])}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
        </div>
      </CardContent>
    </Card>
  );
}
