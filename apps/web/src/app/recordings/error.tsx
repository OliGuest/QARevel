'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function RecordingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Recordings error:', error);
  }, [error]);

  return (
    <AppLayout title="Recordings">
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Failed to load recordings</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Something went wrong loading your recordings.
          </p>
          <Button className="mt-6" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
