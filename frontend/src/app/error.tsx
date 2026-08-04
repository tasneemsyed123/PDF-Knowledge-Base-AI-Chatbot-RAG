'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-6">
          An unexpected error occurred. You can try again, or reload the page.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
