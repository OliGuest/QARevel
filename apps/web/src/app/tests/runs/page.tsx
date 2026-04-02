'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import type { TestRun } from '@qarevel/shared-types';

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'PASSED': return 'success' as const;
    case 'FAILED':
    case 'ERROR': return 'destructive' as const;
    case 'RUNNING': return 'default' as const;
    case 'PENDING': return 'secondary' as const;
    case 'CANCELLED': return 'outline' as const;
    default: return 'secondary' as const;
  }
}

export default function TestRunsPage() {
  const router = useRouter();
  const runsFetcher = useCallback(() => api.getTestRuns(), []);
  const { data: runs, isLoading } = useApi<TestRun[]>(runsFetcher);

  return (
    <AppLayout title="Test Runs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">History of all test runs</p>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !runs || runs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No test runs yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Correlation ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/tests/runs/${run.id}`)}
                >
                  <TableCell className="text-sm">{formatDate(run.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{run.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {run.durationMs ? formatDuration(run.durationMs) : '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                    {run.correlationId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
