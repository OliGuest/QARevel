'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Play } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { TestRunType, TestPriority } from '@qarevel/shared-types';
import type { TestSuite, TestCase } from '@qarevel/shared-types';

export default function SuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const suiteId = params.id as string;

  const suiteFetcher = useCallback(() => api.getTestSuite(suiteId), [suiteId]);
  const casesFetcher = useCallback(() => api.getTestCases(), []);
  const envsFetcher = useCallback(() => api.getEnvironments(), []);

  const { data: suite, isLoading, refetch } = useApi<TestSuite>(suiteFetcher);
  const { data: allCases } = useApi<TestCase[]>(casesFetcher);
  const { data: environments } = useApi<any[]>(envsFetcher);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const suiteCaseIds = new Set((suite as any)?.testCases?.map((c: any) => c.id) || []);
  const availableCases = allCases?.filter((c) => !suiteCaseIds.has(c.id)) || [];

  const handleAddCase = async () => {
    if (!selectedCaseId) return;
    setSubmitting(true);
    try {
      await api.addCaseToSuite(suiteId, selectedCaseId, suiteCaseIds.size + 1);
      setAddDialogOpen(false);
      setSelectedCaseId('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to add test case');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCase = async (caseId: string) => {
    if (!confirm('Remove this test case from the suite?')) return;
    try {
      await api.removeCaseFromSuite(suiteId, caseId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to remove test case');
    }
  };

  const handleRunSuite = async () => {
    if (!selectedEnvId) return;
    setSubmitting(true);
    try {
      const cases = (suite as any)?.testCases || [];
      for (const tc of cases) {
        await api.startTestRun({
          type: TestRunType.AUTOMATED,
          testCaseId: tc.id,
          environmentId: selectedEnvId,
          deviceId: 'browser',
          appTargetId: tc.appTargetId || 'default',
          config: { suiteRunId: suiteId },
        } as any);
      }
      setRunDialogOpen(false);
      router.push('/tests/runs');
    } catch (err: any) {
      alert(err.message || 'Failed to start suite run');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Test Suite">
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  if (!suite) {
    return (
      <AppLayout title="Test Suite">
        <p className="py-8 text-center text-sm text-muted-foreground">Suite not found</p>
      </AppLayout>
    );
  }

  const testCases: TestCase[] = (suite as any).testCases || [];

  return (
    <AppLayout title={suite.name}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/tests/suites')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{suite.name}</h1>
              {suite.description && (
                <p className="text-sm text-muted-foreground mt-1">{suite.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Case
            </Button>
            <Button onClick={() => setRunDialogOpen(true)} disabled={testCases.length === 0}>
              <Play className="h-4 w-4 mr-1" />
              Run Suite
            </Button>
          </div>
        </div>

        {suite.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suite.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Test Cases ({testCases.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {testCases.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No test cases in this suite. Click "Add Case" to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((tc, idx) => (
                    <TableRow key={tc.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{tc.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tc.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tc.priority === TestPriority.CRITICAL ? 'destructive' : tc.priority === TestPriority.HIGH ? 'warning' : 'secondary'}>
                          {tc.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tc.type}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveCase(tc.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} title="Add Test Case to Suite">
        <div className="space-y-4">
          {availableCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">All test cases are already in this suite.</p>
          ) : (
            <>
              <Select
                label="Select Test Case"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
              >
                <option value="">Select a test case...</option>
                {availableCases.map((tc) => (
                  <option key={tc.id} value={tc.id}>{tc.title} ({tc.platform})</option>
                ))}
              </Select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddCase} disabled={!selectedCaseId} loading={submitting}>
                  Add to Suite
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      <Dialog open={runDialogOpen} onClose={() => setRunDialogOpen(false)} title="Run Suite">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will run all {testCases.length} test case(s) in this suite.
          </p>
          <Select
            label="Environment"
            value={selectedEnvId}
            onChange={(e) => setSelectedEnvId(e.target.value)}
          >
            <option value="">Select environment...</option>
            {environments?.map((env) => (
              <option key={env.id} value={env.id}>{env.name} ({env.baseUrl})</option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRunSuite} disabled={!selectedEnvId} loading={submitting}>
              Start Run
            </Button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}
