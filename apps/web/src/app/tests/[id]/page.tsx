'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Play, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import type { TestCase, TestStep, SelectorType, Device, Environment } from '@qarevel/shared-types';

const selectorTypeOptions = [
  { label: 'CSS', value: 'CSS' },
  { label: 'XPath', value: 'XPATH' },
  { label: 'Accessibility ID', value: 'ACCESSIBILITY_ID' },
  { label: 'ID', value: 'ID' },
];

const actionOptions = [
  { label: 'Navigate', value: 'NAVIGATE' },
  { label: 'Click', value: 'CLICK' },
  { label: 'Fill', value: 'FILL' },
  { label: 'Select', value: 'SELECT' },
  { label: 'Check', value: 'CHECK' },
  { label: 'Uncheck', value: 'UNCHECK' },
  { label: 'Hover', value: 'HOVER' },
  { label: 'Scroll', value: 'SCROLL' },
  { label: 'Swipe', value: 'SWIPE' },
  { label: 'Wait', value: 'WAIT' },
  { label: 'Assert Visible', value: 'ASSERT_VISIBLE' },
  { label: 'Assert Text', value: 'ASSERT_TEXT' },
  { label: 'Assert URL', value: 'ASSERT_URL' },
  { label: 'Screenshot', value: 'SCREENSHOT' },
  { label: 'Custom Script', value: 'CUSTOM_SCRIPT' },
];

interface StepForm {
  id?: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
  selector: string;
  selectorType: SelectorType;
  isNew?: boolean;
  isDirty?: boolean;
}

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const testFetcher = useCallback(() => api.getTestCase(id), [id]);
  const analyticsFetcher = useCallback(() => api.getTestCaseAnalytics(id), [id]);
  const { data: testCase, isLoading, refetch } = useApi<TestCase>(testFetcher);
  const { data: analytics } = useApi<any>(analyticsFetcher);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Run with Playwright dialog
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [runDeviceId, setRunDeviceId] = useState('');
  const [runEnvId, setRunEnvId] = useState('');
  const [runLoading, setRunLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);

  const openRunDialog = async () => {
    setShowRunDialog(true);
    try {
      const [devs, envs] = await Promise.all([api.getDevices(), api.getEnvironments()]);
      setDevices(devs);
      setEnvironments(envs);
      if (devs.length > 0 && !runDeviceId) setRunDeviceId(devs[0].id);
      if (envs.length > 0 && !runEnvId) setRunEnvId(envs[0].id);
    } catch (err) {
      alert('Failed to load devices and environments. Please try again.');
    }
  };

  const handleRun = async () => {
    if (!runDeviceId || !runEnvId || !testCase) return;
    setRunLoading(true);
    try {
      const result = await api.startTestRun({
        type: 'automated' as any,
        testCaseId: id,
        deviceId: runDeviceId,
        environmentId: runEnvId,
        appTargetId: testCase.appTargetId || '',
      });
      router.push(`/tests/runs/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start test run');
      setRunLoading(false);
    }
  };

  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title);
      setDescription(testCase.description || '');
      setSteps(
        (testCase.steps || []).map((s) => ({
          id: s.id,
          stepNumber: s.stepNumber,
          action: s.action,
          expectedResult: s.expectedResult || '',
          selector: s.selector || '',
          selectorType: s.selectorType || ('CSS' as SelectorType),
        })),
      );
    }
  }, [testCase]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        action: 'CLICK',
        expectedResult: '',
        selector: '',
        selectorType: 'CSS' as SelectorType,
        isNew: true,
        isDirty: true,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof StepForm, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value, isDirty: true } : s)),
    );
  };

  const removeStep = async (index: number) => {
    const step = steps[index];
    if (step.id && !step.isNew) {
      try {
        await api.deleteTestStep(id, step.id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete step');
        return;
      }
    }
    setSteps((prev) => {
      const newSteps = prev.filter((_, i) => i !== index);
      return newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      const [moved] = newSteps.splice(from, 1);
      newSteps.splice(to, 0, moved);
      return newSteps.map((s, i) => ({ ...s, stepNumber: i + 1, isDirty: true }));
    });
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.updateTestCase(id, { title, description: description || undefined });

      for (const step of steps) {
        if (step.isNew) {
          await api.addTestStep(id, {
            stepNumber: step.stepNumber,
            action: step.action,
            expectedResult: step.expectedResult || undefined,
            selector: step.selector || undefined,
            selectorType: step.selectorType || undefined,
          });
        } else if (step.isDirty && step.id) {
          await api.updateTestStep(id, step.id, {
            stepNumber: step.stepNumber,
            action: step.action,
            expectedResult: step.expectedResult || undefined,
            selector: step.selector || undefined,
            selectorType: step.selectorType || undefined,
          });
        }
      }

      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Test Case">
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Test Case Details">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/tests')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={openRunDialog}>
            <Play className="h-4 w-4" />
            Run with Playwright
          </Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>

        {error && (
          <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Test Case Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            {testCase && (
              <div className="flex gap-3">
                <Badge variant="secondary">{testCase.platform}</Badge>
                <Badge variant="secondary">{testCase.type}</Badge>
                <Badge variant="secondary">{testCase.priority}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Steps ({steps.length})</CardTitle>
            <Button size="sm" onClick={addStep}>
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No steps yet. Click &quot;Add Step&quot; to create one.
              </p>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="rounded-[var(--radius)] border border-border p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveStep(index, index - 1)}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveStep(index, index + 1)}
                          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={index === steps.length - 1}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {step.stepNumber}
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Action"
                        options={actionOptions}
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                      />
                      <Input
                        label="Expected Result"
                        placeholder="Page should display..."
                        value={step.expectedResult}
                        onChange={(e) => updateStep(index, 'expectedResult', e.target.value)}
                      />
                      <Input
                        label="Selector"
                        placeholder="#login-btn, //button[@id='submit']"
                        value={step.selector}
                        onChange={(e) => updateStep(index, 'selector', e.target.value)}
                      />
                      <Select
                        label="Selector Type"
                        options={selectorTypeOptions}
                        value={step.selectorType}
                        onChange={(e) => updateStep(index, 'selectorType', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Card */}
      {analytics && analytics.totalRuns > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm text-muted-foreground">Total Runs</p>
                <p className="text-2xl font-bold">{analytics.totalRuns}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className={`text-2xl font-bold ${analytics.passRate >= 80 ? 'text-emerald-600' : analytics.passRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {analytics.passRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flakiness</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${analytics.flakinessScore > 50 ? 'text-red-500' : analytics.flakinessScore > 25 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {analytics.flakinessScore}
                  </p>
                  {analytics.isFlakyCandidate && (
                    <Badge variant="warning">Flaky</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {analytics.avgDurationMs ? `${(analytics.avgDurationMs / 1000).toFixed(1)}s` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration Trend</p>
                <div className="flex items-center gap-1">
                  {analytics.durationTrend === 'improving' && <TrendingDown className="h-5 w-5 text-emerald-600" />}
                  {analytics.durationTrend === 'degrading' && <TrendingUp className="h-5 w-5 text-red-500" />}
                  {analytics.durationTrend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
                  <span className="text-sm capitalize">{analytics.durationTrend?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Recent run results strip */}
            {analytics.recentRuns?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Runs</p>
                <div className="flex gap-1">
                  {analytics.recentRuns.slice(0, 30).map((run: any) => (
                    <div
                      key={run.id}
                      className={`w-3 h-8 rounded-sm ${
                        run.status === 'passed' ? 'bg-emerald-500' :
                        run.status === 'failed' ? 'bg-red-500' :
                        run.status === 'error' ? 'bg-orange-500' :
                        'bg-gray-300'
                      }`}
                      title={`${run.status} — ${run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : 'N/A'}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showRunDialog}
        onClose={() => setShowRunDialog(false)}
        title="Run with Playwright"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Execute this test case automatically using Playwright Chromium.
          </p>
          <Select
            label="Device"
            options={devices.map((d) => ({ label: `${d.name} (${d.platform})`, value: d.id }))}
            value={runDeviceId}
            onChange={(e) => setRunDeviceId(e.target.value)}
          />
          <Select
            label="Environment"
            options={environments.map((e) => ({ label: `${e.name} — ${e.baseUrl}`, value: e.id }))}
            value={runEnvId}
            onChange={(e) => setRunEnvId(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun} loading={runLoading} disabled={!runDeviceId || !runEnvId}>
              <Play className="h-4 w-4" />
              Run Test
            </Button>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}
