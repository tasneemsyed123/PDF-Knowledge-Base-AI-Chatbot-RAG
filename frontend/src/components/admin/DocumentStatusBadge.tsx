import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/types';

const STATUS_CONFIG: Record<DocumentStatus, { label: string; variant: 'secondary' | 'warning' | 'success' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={status === 'processing' ? 'animate-pulse' : undefined}>
      {config.label}
    </Badge>
  );
}
