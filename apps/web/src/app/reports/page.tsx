'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Eye, Download } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Report } from '@qarevel/shared-types';

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'READY': return 'success' as const;
    case 'GENERATING': return 'warning' as const;
    case 'ERROR': return 'destructive' as const;
    default: return 'secondary' as const;
  }
}

export default function ReportsPage() {
  const reportsFetcher = useCallback(() => api.getReports(), []);
  const { data: reports, isLoading } = useApi<Report[]>(reportsFetcher);

  return (
    <AppLayout title="Reports">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">View and download test reports</p>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : !reports || reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reports generated yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Run</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {report.testRunId.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(report.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/reports/${report.id}`}>
                        <Button variant="ghost" size="sm" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {report.storageKey && (
                        <Button variant="ghost" size="sm" title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
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
