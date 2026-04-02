'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { TestRunType } from '@qarevel/shared-types';
import type { Device, Environment, AppTarget, TestRun } from '@qarevel/shared-types';

export default function SessionsPage() {
  const router = useRouter();
  const devicesFetcher = useCallback(() => api.getDevices(), []);
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const targetsFetcher = useCallback(() => api.getAppTargets(), []);
  const runsFetcher = useCallback(() => api.getTestRuns({ type: TestRunType.MANUAL }), []);

  const { data: devices } = useApi<Device[]>(devicesFetcher);
  const { data: environments } = useApi<Environment[]>(envsFetcher);
  const { data: targets } = useApi<AppTarget[]>(targetsFetcher);
  const { data: sessions, isLoading } = useApi<TestRun[]>(runsFetcher);

  const [deviceId, setDeviceId] = useState('');
  const [envId, setEnvId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!deviceId || !envId || !targetId) {
      setError('Please select a device, environment, and app target');
      return;
    }
    setError('');
    setStarting(true);
    try {
      const result = await api.startSession({
        type: TestRunType.MANUAL,
        deviceId,
        environmentId: envId,
        appTargetId: targetId,
      });
      router.push(`/sessions/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  function statusBadgeVariant(status: string) {
    switch (status) {
      case 'PASSED': return 'success' as const;
      case 'FAILED':
      case 'ERROR': return 'destructive' as const;
      case 'RUNNING': return 'default' as const;
      default: return 'secondary' as const;
    }
  }

  return (
    <AppLayout title="Manual Sessions">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Start New Session</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Device"
                placeholder="Select device..."
                options={(devices || []).map((d) => ({ label: `${d.name} (${d.platform})`, value: d.id }))}
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
              />
              <Select
                label="Environment"
                placeholder="Select environment..."
                options={(environments || []).map((e) => ({ label: e.name, value: e.id }))}
                value={envId}
                onChange={(e) => setEnvId(e.target.value)}
              />
              <Select
                label="App Target"
                placeholder="Select app target..."
                options={(targets || []).map((t) => ({ label: t.name, value: t.id }))}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <Button onClick={handleStart} loading={starting}>
                <Play className="h-4 w-4" />
                Start Session
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Sessions</h2>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : !sessions || sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sessions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Correlation ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/sessions/${session.id}`)}
                  >
                    <TableCell className="text-sm">{formatDate(session.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(session.status)}>{session.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {session.durationMs ? formatDuration(session.durationMs) : 'In progress'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">
                      {session.correlationId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
