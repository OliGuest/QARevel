'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { AppLayout } from '@/components/layout/AppLayout';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TestRunSummary {
  id: string;
  status: string;
  durationMs: number;
  createdAt: string;
  testCase?: { id: string; title: string };
  summary?: { total: number; passed: number; failed: number; skipped: number };
}

interface FlakyTest {
  testCaseId: string;
  title: string;
  totalRuns: number;
  failureRate: number;
  lastStatus: string;
  isFlaky: boolean;
}

export default function InsightsPage() {
  const router = useRouter();
  const [testRuns, setTestRuns] = useState<TestRunSummary[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const loadData = async () => {
    setLoading(true);
    try {
      const [runs, cases, envs, devs] = await Promise.all([
        api.getTestRuns().catch(() => []),
        api.getTestCases().catch(() => []),
        api.getEnvironments().catch(() => []),
        api.getDevices().catch(() => []),
      ]);
      setTestRuns(runs as TestRunSummary[]);
      setTestCases(cases);
      setEnvironments(envs);
      setDevices(devs);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Calculate stats
  const totalRuns = testRuns.length;
  const passedRuns = testRuns.filter((r) => r.status === 'passed').length;
  const failedRuns = testRuns.filter((r) => r.status === 'failed').length;
  const errorRuns = testRuns.filter((r) => r.status === 'error').length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  const avgDuration = totalRuns > 0 ? Math.round(testRuns.reduce((sum, r) => sum + (r.durationMs || 0), 0) / totalRuns / 1000) : 0;

  // Flaky test detection (F4)
  const flakyTests: FlakyTest[] = (() => {
    const testRunMap = new Map<string, { passed: number; failed: number; total: number; title: string; lastStatus: string }>();

    for (const run of testRuns) {
      const caseId = run.testCase?.id;
      if (!caseId) continue;

      const existing = testRunMap.get(caseId) || { passed: 0, failed: 0, total: 0, title: run.testCase?.title || 'Unknown', lastStatus: '' };
      existing.total++;
      if (run.status === 'passed') existing.passed++;
      if (run.status === 'failed' || run.status === 'error') existing.failed++;
      existing.lastStatus = run.status;
      testRunMap.set(caseId, existing);
    }

    return Array.from(testRunMap.entries())
      .map(([id, data]) => ({
        testCaseId: id,
        title: data.title,
        totalRuns: data.total,
        failureRate: data.total > 0 ? Math.round((data.failed / data.total) * 100) : 0,
        lastStatus: data.lastStatus,
        isFlaky: data.total >= 3 && data.failed > 0 && data.passed > 0 && (data.failed / data.total) >= 0.2 && (data.failed / data.total) <= 0.8,
      }))
      .filter((t) => t.totalRuns >= 2)
      .sort((a, b) => b.failureRate - a.failureRate);
  })();

  const flakyCount = flakyTests.filter((t) => t.isFlaky).length;

  // Recent failures
  const recentFailures = testRuns
    .filter((r) => r.status === 'failed' || r.status === 'error')
    .slice(0, 5);

  return (
    <AppLayout title="Insights">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">Test health, flaky detection, and error analysis</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Health Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="stat-green">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">{passRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-blue">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{totalRuns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-red">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{failedRuns + errorRuns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-amber">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Flaky Tests</p>
                <p className="text-2xl font-bold">{flakyCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-purple">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">{avgDuration}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-gray-500/10">
                <Zap className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Test Cases</p>
                <p className="text-2xl font-bold">{testCases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two columns: Flaky Tests + Recent Failures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flaky Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Flaky Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flakyTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No test data yet. Run some tests to see flaky detection.</p>
            ) : (
              <div className="space-y-3">
                {flakyTests.slice(0, 10).map((test) => (
                  <div
                    key={test.testCaseId}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/tests/${test.testCaseId}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{test.title}</p>
                      <p className="text-xs text-muted-foreground">{test.totalRuns} runs</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.isFlaky && <Badge variant="warning">Flaky</Badge>}
                      <div className="text-right">
                        <p className={cn('text-sm font-bold', test.failureRate > 50 ? 'text-red-600' : test.failureRate > 20 ? 'text-amber-600' : 'text-emerald-600')}>
                          {test.failureRate}% fail
                        </p>
                      </div>
                      {/* Mini pass/fail bar */}
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5" style={{ width: `${100 - test.failureRate}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Failures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Recent Failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent failures. Everything is passing!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFailures.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/tests/runs/${run.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{run.testCase?.title || 'Unknown Test'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === 'error' ? 'destructive' : 'warning'}>
                        {run.status}
                      </Badge>
                      {run.summary && (
                        <span className="text-xs text-muted-foreground">
                          {run.summary.passed}/{run.summary.total}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Environment Health + Platform Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Environment Health</CardTitle>
          </CardHeader>
          <CardContent>
            {environments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No environments configured</p>
            ) : (
              <div className="space-y-3">
                {environments.map((env: any) => (
                  <div key={env.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{env.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{env.baseUrl}</p>
                    </div>
                    <Badge variant={env.status === 'healthy' ? 'default' : env.status === 'error' ? 'destructive' : 'secondary'}>
                      {env.status || 'unknown'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Test Cases</span>
                <span className="text-lg font-bold">{testCases.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Automated</span>
                <span className="text-lg font-bold">{testCases.filter((t: any) => t.type === 'AUTOMATED').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Manual</span>
                <span className="text-lg font-bold">{testCases.filter((t: any) => t.type === 'MANUAL').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Devices Registered</span>
                <span className="text-lg font-bold">{devices.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Environments</span>
                <span className="text-lg font-bold">{environments.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AppLayout>
  );
}
