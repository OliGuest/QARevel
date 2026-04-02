'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import type { Report, TestStepResult, LogEntry } from '@qarevel/shared-types';

type ReportWithDetails = Report & { steps?: TestStepResult[]; logs?: LogEntry[] };

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const reportFetcher = useCallback(() => api.getReport(id), [id]);
  const { data: report, isLoading } = useApi<ReportWithDetails>(reportFetcher);

  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'steps' | 'errors' | 'performance'>('steps');

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const summary = report?.summary as Record<string, any> | undefined;
  const steps = report?.steps || [];
  const logs = report?.logs || [];
  const errors = steps.filter((s) => s.status === 'FAILED' || s.status === 'ERROR');

  if (isLoading) {
    return (
      <AppLayout title="Report">
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Report Details">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Summary card */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    summary?.status === 'PASSED'
                      ? 'success'
                      : summary?.status === 'FAILED'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="mt-1"
                >
                  {summary?.status || report?.status || '-'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-lg font-semibold">
                  {summary?.durationMs ? formatDuration(summary.durationMs) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Steps</p>
                <p className="text-lg font-semibold">{summary?.totalSteps || steps.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Results</p>
                <div className="mt-1 flex gap-2 text-sm">
                  <span className="text-success">{summary?.passed || 0} passed</span>
                  <span className="text-destructive">{summary?.failed || 0} failed</span>
                  <span className="text-warning">{summary?.skipped || 0} skipped</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(['steps', 'errors', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'errors' && errors.length > 0 && (
                <Badge variant="destructive" className="ml-2">{errors.length}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Steps tab */}
        {activeTab === 'steps' && (
          <div className="space-y-2">
            {steps.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No step results available</p>
            ) : (
              steps.map((step, index) => (
                <Card key={step.id || index}>
                  <button
                    onClick={() => toggleStep(index)}
                    className="flex w-full items-center gap-3 p-4 text-left"
                  >
                    {expandedSteps.has(index) ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {step.stepNumber}
                    </span>
                    {step.status === 'PASSED' && <CheckCircle className="h-4 w-4 text-success" />}
                    {(step.status === 'FAILED' || step.status === 'ERROR') && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {step.status === 'SKIPPED' && <AlertTriangle className="h-4 w-4 text-warning" />}
                    <Badge
                      variant={
                        step.status === 'PASSED'
                          ? 'success'
                          : step.status === 'FAILED' || step.status === 'ERROR'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {step.status}
                    </Badge>
                    {step.durationMs && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDuration(step.durationMs)}
                      </span>
                    )}
                  </button>
                  {expandedSteps.has(index) && (
                    <CardContent className="border-t border-border">
                      <div className="space-y-3">
                        {step.actualResult && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Actual Result</p>
                            <p className="text-sm">{step.actualResult}</p>
                          </div>
                        )}
                        {step.errorMessage && (
                          <div>
                            <p className="text-xs font-medium text-destructive">Error</p>
                            <pre className="mt-1 overflow-x-auto rounded bg-muted p-3 text-xs font-mono">
                              {step.errorMessage}
                            </pre>
                          </div>
                        )}
                        {step.screenshotKey && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Screenshot</p>
                            <div className="mt-1 h-48 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              Screenshot: {step.screenshotKey}
                            </div>
                          </div>
                        )}
                        {step.notes && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Notes</p>
                            <p className="text-sm">{step.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Errors tab */}
        {activeTab === 'errors' && (
          <div className="space-y-3">
            {errors.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No errors in this run</p>
            ) : (
              errors.map((step, index) => (
                <Card key={step.id || index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Step {step.stepNumber}</span>
                      <Badge variant="destructive">{step.status}</Badge>
                    </div>
                    {step.errorMessage && (
                      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs font-mono">
                        {step.errorMessage}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Performance tab */}
        {activeTab === 'performance' && (
          <Card>
            <CardContent className="pt-6">
              <p className="py-8 text-center text-sm text-muted-foreground">
                Performance metrics coming soon. Step timing data will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
