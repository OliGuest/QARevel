'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Square,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  ImageIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { useApi } from '@/hooks/useApi';
import { useTestRunSocket } from '@/hooks/useTestRunSocket';
import { api } from '@/lib/api';
import type { TestRun } from '@qarevel/shared-types';

interface StepResult {
  id: string;
  testRunId: string;
  testStepId: string | null;
  stepNumber: number;
  status: string;
  actualResult: string | null;
  errorMessage: string | null;
  screenshotKey: string | null;
  durationMs: number | null;
  executedAt: string;
}

const statusVariant = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'passed': return 'success' as const;
    case 'failed': case 'error': return 'destructive' as const;
    case 'running': return 'warning' as const;
    case 'cancelled': case 'skipped': return 'secondary' as const;
    default: return 'outline' as const;
  }
};

const StepIcon = ({ status }: { status: string }) => {
  switch (status?.toLowerCase()) {
    case 'passed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'failed':
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'skipped':
      return <MinusCircle className="h-5 w-5 text-gray-400" />;
    default:
      return <Loader2 className="h-5 w-5 animate-spin text-amber-500" />;
  }
};

function ScreenshotImage({ storageKey }: { storageKey: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('qarevel_access_token');
    if (!token || !storageKey) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const base = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

    fetch(`${base}/attachments/screenshot?key=${encodeURIComponent(storageKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => setSrc(URL.createObjectURL(blob)))
      .catch(() => {});

    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [storageKey]);

  if (!src) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-muted text-muted-foreground">
        <ImageIcon className="h-6 w-6" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Failure screenshot"
      className="max-h-64 rounded border border-border object-contain"
    />
  );
}

export default function TestRunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const stepsEndRef = useRef<HTMLDivElement>(null);

  // Fetch test run details
  const runFetcher = useCallback(() => api.getTestRun(id), [id]);
  const { data: testRun, isLoading } = useApi<TestRun>(runFetcher);

  // Fetch initial step results (for page reload mid-run)
  const [initialResults, setInitialResults] = useState<StepResult[]>([]);
  useEffect(() => {
    api.getTestRunStepResults(id).then(setInitialResults).catch(() => {});
  }, [id]);

  // Connect WebSocket
  const { stepResults: socketResults, status: socketStatus, summary: socketSummary, isConnected } =
    useTestRunSocket(id);

  // Merge initial + socket results, deduplicate by stepNumber
  const [allResults, setAllResults] = useState<StepResult[]>([]);
  useEffect(() => {
    const map = new Map<number, StepResult>();
    for (const r of initialResults) map.set(r.stepNumber, r);
    for (const r of socketResults) map.set(r.stepNumber, r);
    setAllResults(Array.from(map.values()).sort((a, b) => a.stepNumber - b.stepNumber));
  }, [initialResults, socketResults]);

  // Current status (prefer socket updates over initial)
  const currentStatus = socketStatus || testRun?.status || 'pending';
  const currentSummary = socketSummary || (testRun as any)?.summary;
  const isTerminal = ['passed', 'failed', 'error', 'cancelled'].includes(currentStatus);

  // Auto-scroll to latest step
  useEffect(() => {
    if (allResults.length > 0) {
      stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allResults.length]);

  // Stop test
  const [stopping, setStopping] = useState(false);
  const handleStop = async () => {
    setStopping(true);
    try {
      await api.stopTestRun(id);
    } catch {
    } finally {
      setStopping(false);
    }
  };

  // Get test case steps for reference (to show pending steps)
  const testCaseSteps = (testRun as any)?.testCase?.steps || [];

  if (isLoading) {
    return (
      <AppLayout title="Test Run">
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Test Run">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/tests/runs')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <><Wifi className="h-4 w-4 text-green-500" /> Live</>
            ) : (
              <><WifiOff className="h-4 w-4 text-gray-400" /> Offline</>
            )}
          </div>
          {!isTerminal && (
            <Button variant="destructive" size="sm" onClick={handleStop} loading={stopping}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Test Case</div>
              <div className="mt-1 text-sm font-medium truncate">
                {(testRun as any)?.testCase?.title || 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Environment</div>
              <div className="mt-1 text-sm font-medium truncate">
                {(testRun as any)?.environment?.name || 'N/A'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge variant={statusVariant(currentStatus)}>
                  {currentStatus.toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Duration</div>
              <div className="mt-1 flex items-center gap-1 text-sm font-medium">
                <Clock className="h-3.5 w-3.5" />
                {testRun?.durationMs
                  ? `${(testRun.durationMs / 1000).toFixed(1)}s`
                  : isTerminal
                    ? 'N/A'
                    : 'Running...'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary bar */}
        {currentSummary && (
          <div className="flex gap-4 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
            <span className="text-sm">
              <span className="font-medium text-green-600">{currentSummary.passed ?? 0}</span> passed
            </span>
            <span className="text-sm">
              <span className="font-medium text-red-600">{currentSummary.failed ?? 0}</span> failed
            </span>
            <span className="text-sm">
              <span className="font-medium text-gray-500">{currentSummary.skipped ?? 0}</span> skipped
            </span>
            <span className="text-sm text-muted-foreground">
              / {currentSummary.total ?? 0} total
            </span>
          </div>
        )}

        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {allResults.length === 0 && !isTerminal ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for execution to start...
              </div>
            ) : allResults.length === 0 && isTerminal ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No step results recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {allResults.map((result) => (
                  <div
                    key={result.stepNumber}
                    className="rounded-[var(--radius)] border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {result.stepNumber}
                      </span>
                      <StepIcon status={result.status} />
                      <Badge variant={statusVariant(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                      <div className="flex-1 text-sm text-muted-foreground truncate">
                        {result.actualResult || ''}
                      </div>
                      {result.durationMs != null && (
                        <span className="text-xs text-muted-foreground">
                          {result.durationMs}ms
                        </span>
                      )}
                    </div>

                    {result.errorMessage && (
                      <div className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                        <code className="whitespace-pre-wrap break-all">{result.errorMessage}</code>
                      </div>
                    )}

                    {result.screenshotKey && (
                      <div className="mt-2">
                        <ScreenshotImage storageKey={result.screenshotKey} />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={stepsEndRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Terminal banner */}
        {isTerminal && (
          <div
            className={`rounded-[var(--radius)] border px-4 py-3 text-center text-sm font-medium ${
              currentStatus === 'passed'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400'
                : currentStatus === 'cancelled'
                  ? 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-400'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400'
            }`}
          >
            Test run {currentStatus === 'passed' ? 'completed successfully' : currentStatus === 'cancelled' ? 'was cancelled' : 'failed'}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
