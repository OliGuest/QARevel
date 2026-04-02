'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Square, CheckCircle, XCircle, SkipForward, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { StepStatus } from '@qarevel/shared-types';
import type { TestRun, LogEntry } from '@qarevel/shared-types';

interface SessionStep {
  stepNumber: number;
  status: StepStatus | null;
  notes: string;
  actualResult: string;
}

export default function ActiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const runFetcher = useCallback(() => api.getTestRun(id), [id]);
  const { data: run, refetch } = useApi<TestRun>(runFetcher);

  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (run?.status === 'RUNNING' && run.startedAt) {
      const start = new Date(run.startedAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [run]);

  useEffect(() => {
    if (run?.correlationId) {
      api.getLogs({ correlationId: run.correlationId, limit: '50' })
        .then(setLogs)
        .catch(() => {});
    }
  }, [run]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, status: null, notes: '', actualResult: '' },
    ]);
  };

  const markStep = async (index: number, status: StepStatus) => {
    const step = steps[index];
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s)),
    );
    try {
      await api.addSessionStep(id, {
        stepNumber: step.stepNumber,
        status,
        notes: step.notes || undefined,
        actualResult: step.actualResult || undefined,
      });
    } catch (err: any) {
      console.error('Failed to save step result:', err);
    }
  };

  const updateStepField = (index: number, field: 'notes' | 'actualResult', value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await api.stopTestRun(id);
      refetch();
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err: any) {
      alert(err.message || 'Failed to stop session');
    } finally {
      setStopping(false);
    }
  };

  const isRunning = run?.status === 'RUNNING';

  return (
    <AppLayout title="Test Session">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/sessions')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          {isRunning && (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatDuration(elapsed)}
              </div>
              <Button variant="destructive" onClick={handleStop} loading={stopping}>
                <Square className="h-4 w-4" />
                Stop Session
              </Button>
            </>
          )}
        </div>

        {/* Session header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Badge variant={isRunning ? 'default' : 'secondary'}>
                {run?.status || 'Loading'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Correlation: <span className="font-mono">{run?.correlationId || '...'}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Steps panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Steps</h2>
              {isRunning && (
                <Button size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4" />
                  Add Step
                </Button>
              )}
            </div>

            {steps.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-sm text-muted-foreground">
                    {isRunning ? 'Click "Add Step" to begin testing' : 'No steps recorded'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {step.stepNumber}
                        </span>
                        {step.status && (
                          <Badge
                            variant={
                              step.status === 'PASSED'
                                ? 'success'
                                : step.status === 'FAILED'
                                  ? 'destructive'
                                  : 'warning'
                            }
                          >
                            {step.status}
                          </Badge>
                        )}
                        <div className="flex-1" />
                        {isRunning && !step.status && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markStep(index, StepStatus.PASSED)}
                              title="Pass"
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markStep(index, StepStatus.FAILED)}
                              title="Fail"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markStep(index, StepStatus.SKIPPED)}
                              title="Skip"
                            >
                              <SkipForward className="h-4 w-4 text-warning" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          placeholder="Actual result..."
                          value={step.actualResult}
                          onChange={(e) => updateStepField(index, 'actualResult', e.target.value)}
                          disabled={!isRunning || !!step.status}
                        />
                        <Input
                          placeholder="Notes..."
                          value={step.notes}
                          onChange={(e) => updateStepField(index, 'notes', e.target.value)}
                          disabled={!isRunning || !!step.status}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Log panel */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Logs</h2>
            <Card>
              <CardContent className="pt-4">
                {logs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No logs yet</p>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-2">
                    {logs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="rounded bg-muted/50 px-3 py-2 text-xs font-mono"
                      >
                        <span className={`font-bold ${log.level === 'ERROR' || log.level === 'FATAL' ? 'text-destructive' : log.level === 'WARN' ? 'text-warning' : 'text-muted-foreground'}`}>
                          [{log.level}]
                        </span>{' '}
                        <span className="text-muted-foreground">{log.source}</span>{' '}
                        <span className="text-foreground">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
