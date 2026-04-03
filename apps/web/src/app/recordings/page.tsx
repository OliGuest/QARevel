'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Search, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDuration, getRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';

function statusDotClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'running': return 'status-dot status-dot-running';
    case 'completed': return 'status-dot status-dot-completed';
    case 'error': return 'status-dot status-dot-error';
    case 'stopping': return 'status-dot status-dot-stopping';
    default: return 'status-dot status-dot-idle';
  }
}

export default function RecordingsPage() {
  const router = useRouter();
  const fetcher = useCallback(() => api.getRecordings(), []);
  const { data: recordings, isLoading, refetch } = useApi<any[]>(fetcher);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this recording and all its events?')) return;
    try {
      await api.deleteRecording(id);
      refetch();
    } catch (err) {
      alert('Failed to delete recording. Please try again.');
    }
  };

  const filteredRecordings = (recordings || []).filter((rec: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (rec.name || '').toLowerCase().includes(q) ||
      (rec.environment?.name || '').toLowerCase().includes(q) ||
      (rec.status || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredRecordings.length / pageSize);
  const paginatedRecordings = filteredRecordings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalEvents = (rec: any) => {
    const summary = rec.summary || {};
    return (summary.totalEvents || 0);
  };

  return (
    <AppLayout title="Recordings">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">All past recording sessions</p>

        {/* Search/filter bar */}
        <Card className="!shadow-none border-border/60">
          <CardContent className="py-3 px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, environment, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border-0 text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background',
                )}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <TableSkeleton rows={6} cols={7} />
          </Card>
        ) : !recordings || recordings.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Film className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No recordings yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Start a testing session to record browser interactions and see them here.
            </p>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No recordings match your search</p>
          </div>
        ) : (
          <>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecordings.map((rec: any) => (
                    <TableRow
                      key={rec.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/recordings/${rec.id}`)}
                    >
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {rec.name || <span className="text-muted-foreground italic">Untitled</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {rec.environment?.name || rec.environmentId || '-'}
                          </span>
                          {rec.config?.deviceProfile && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                              {rec.config.deviceProfile.replace('web-', '').replace('android-', 'A:')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getRelativeTime(rec.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rec.durationMs ? formatDuration(rec.durationMs) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {totalEvents(rec) || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={statusDotClass(rec.status)} />
                          <span className="text-sm capitalize">{rec.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => handleDelete(rec.id, e)}
                          aria-label="Delete recording"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
