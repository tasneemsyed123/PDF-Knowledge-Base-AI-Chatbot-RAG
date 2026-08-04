import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card className={cn('animate-fadeIn', className)}>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-full bg-blue-50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </CardContent>
    </Card>
  );
}
