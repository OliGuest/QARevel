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
          <div className="space-y-4">
            {/* Step Duration Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Step Durations</CardTitle>
              </CardHeader>
              <CardContent>
                {steps.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No step data available</p>
                ) : (
                  <div className="space-y-2">
                    {steps
                      .filter((s) => s.durationMs)
                      .sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))
                      .map((step) => {
                        const maxDuration = Math.max(...steps.map((s) => s.durationMs || 0));
                        const pct = maxDuration > 0 ? ((step.durationMs || 0) / maxDuration) * 100 : 0;
                        return (
                          <div key={step.id || step.stepNumber} className="flex items-center gap-3">
                            <span className="w-16 text-xs text-muted-foreground shrink-0">Step {step.stepNumber}</span>
                            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                              <div
                                className={`h-full rounded ${
                                  step.status === 'PASSED' ? 'bg-emerald-500' :
                                  step.status === 'FAILED' || step.status === 'ERROR' ? 'bg-red-500' :
                                  'bg-amber-500'
                                }`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                            <span className="w-20 text-xs text-right font-mono text-muted-foreground shrink-0">
                              {formatDuration(step.durationMs || 0)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Performance Summary */}
            {summary?.apiSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>API Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{summary.apiSummary.totalRequests || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">{summary.apiSummary.avgResponseMs || 0}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <p className={`text-2xl font-bold ${(summary.apiSummary.errorRate || 0) > 5 ? 'text-destructive' : 'text-success'}`}>
                        {(summary.apiSummary.errorRate || 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed Requests</p>
                      <p className="text-2xl font-bold text-destructive">{summary.apiSummary.failedRequests || 0}</p>
                    </div>
                  </div>

                  {/* Response Time Percentiles */}
                  {(summary.apiSummary.p50 || summary.apiSummary.p95 || summary.apiSummary.p99) && (
                    <div className="mt-6 border-t border-border pt-4">
                      <p className="text-sm font-medium mb-3">Response Time Percentiles</p>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="text-center p-3 rounded bg-muted">
                          <p className="text-xs text-muted-foreground">p50 (median)</p>
                          <p className="text-lg font-bold">{summary.apiSummary.p50 || 0}ms</p>
                        </div>
                        <div className="text-center p-3 rounded bg-muted">
                          <p className="text-xs text-muted-foreground">p95</p>
                          <p className="text-lg font-bold">{summary.apiSummary.p95 || 0}ms</p>
                        </div>
                        <div className="text-center p-3 rounded bg-muted">
                          <p className="text-xs text-muted-foreground">p99</p>
                          <p className="text-lg font-bold">{summary.apiSummary.p99 || 0}ms</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Overall Timing */}
            <Card>
              <CardHeader>
                <CardTitle>Timing Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Duration</p>
                    <p className="text-lg font-semibold">{summary?.durationMs ? formatDuration(summary.durationMs) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Step Duration</p>
                    <p className="text-lg font-semibold">
                      {steps.length > 0
                        ? formatDuration(
                            Math.round(steps.reduce((sum, s) => sum + (s.durationMs || 0), 0) / steps.length)
                          )
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Slowest Step</p>
                    <p className="text-lg font-semibold">
                      {(() => {
                        const slowest = steps.reduce((max, s) => (s.durationMs || 0) > (max?.durationMs || 0) ? s : max, steps[0]);
                        return slowest?.durationMs ? `Step ${slowest.stepNumber} (${formatDuration(slowest.durationMs)})` : '-';
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
