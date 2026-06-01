'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Play,
  Shuffle,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  FolderOpen,
  Tag,
  Trash2,
  Clock,
  Square,
  Repeat,
  Settings2,
  Users,
  Gauge,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RunResult {
  uid: string;
  testCaseId: string;
  title: string;
  runId: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  worker?: number;
}

// Load-test duration presets (minutes).
const DURATION_PRESETS = [15, 30, 60, 120, 240, 480];
const fmtDuration = (min: number) =>
  min < 60 ? `${min}m` : Number.isInteger(min / 60) ? `${min / 60}h` : `${(min / 60).toFixed(1)}h`;

export default function AutomationPage() {
  const router = useRouter();

  const testCasesFetcher = useCallback(() => api.getTestCases({ type: 'automated' }), []);
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const devicesFetcher = useCallback(() => api.getDevices(), []);

  const { data: testCases, isLoading: loadingCases, refetch: refetchCases } = useApi<any[]>(testCasesFetcher);
  const { data: environments } = useApi<any[]>(envsFetcher);
  const { data: devices } = useApi<any[]>(devicesFetcher);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [envId, setEnvId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const stopRef = useRef(false);

  // Run mode
  const [runMode, setRunMode] = useState<'single' | 'load'>('single');
  const [loadDurationMin, setLoadDurationMin] = useState(30);
  const [loadElapsed, setLoadElapsed] = useState(0);
  const [loadCycles, setLoadCycles] = useState(0);

  // Load-test advanced options
  const [loadConcurrency, setLoadConcurrency] = useState(1);
  const [loadOrder, setLoadOrder] = useState<'random' | 'sequential'>('random');
  const [loadThinkSec, setLoadThinkSec] = useState(0);
  const [loadStopOnFailure, setLoadStopOnFailure] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const uidRef = useRef(0);

  // New category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Auto-select first env/device
  if (!envId && environments?.length) setEnvId(environments[0].id);
  if (!deviceId && devices?.length) setDeviceId(devices[0].id);

  // Extract categories from tags (first tag = category)
  const categories = Array.from(
    new Set((testCases || []).flatMap((tc: any) => tc.tags || []))
  ).sort();

  // Filter by category
  const filteredCases = (testCases || []).filter((tc: any) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'uncategorized') return !tc.tags || tc.tags.length === 0;
    return (tc.tags || []).includes(selectedCategory);
  });

  const uncategorizedCount = (testCases || []).filter((tc: any) => !tc.tags || tc.tags.length === 0).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (filteredCases.every((tc: any) => selectedIds.has(tc.id))) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCases.forEach((tc: any) => next.delete(tc.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCases.forEach((tc: any) => next.add(tc.id));
        return next;
      });
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    // Category is just a tag — it gets created when assigned to a test case
    // For now just select it
    setNewCategoryName('');
    setShowNewCategory(false);
    setSelectedCategory(name);
  };

  const handleAssignCategory = async (testCaseId: string, category: string) => {
    const tc = (testCases || []).find((t: any) => t.id === testCaseId);
    if (!tc) return;
    const currentTags: string[] = tc.tags || [];
    if (currentTags.includes(category)) return;
    try {
      await api.updateTestCase(testCaseId, { tags: [...currentTags, category] });
      refetchCases();
    } catch {}
  };

  const handleRemoveCategory = async (testCaseId: string, category: string) => {
    const tc = (testCases || []).find((t: any) => t.id === testCaseId);
    if (!tc) return;
    try {
      await api.updateTestCase(testCaseId, { tags: (tc.tags || []).filter((t: string) => t !== category) });
      refetchCases();
    } catch {}
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Remove category "${category}" from all test cases?`)) return;
    const affected = (testCases || []).filter((tc: any) => (tc.tags || []).includes(category));
    for (const tc of affected) {
      try {
        await api.updateTestCase(tc.id, { tags: (tc.tags || []).filter((t: string) => t !== category) });
      } catch {}
    }
    if (selectedCategory === category) setSelectedCategory('all');
    refetchCases();
  };

  const handleDeleteTestCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this test case?')) return;
    try {
      await api.deleteTestCase(id);
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
      refetchCases();
    } catch {}
  };

  // Run a single test case and return its status
  const runOneTest = async (tc: any): Promise<{ runId: string; status: string }> => {
    try {
      const run = await api.startTestRun({
        type: 'automated' as any,
        testCaseId: tc.id,
        deviceId,
        environmentId: envId,
        appTargetId: tc.appTargetId || '',
      });
      let finalStatus = 'pending';
      for (let t = 0; t < 30; t++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const runData = await api.getTestRun(run.id);
          if (['passed', 'failed', 'error', 'cancelled'].includes(runData.status)) {
            finalStatus = runData.status;
            break;
          }
        } catch { break; }
      }
      return { runId: run.id, status: finalStatus };
    } catch {
      return { runId: '', status: 'error' };
    }
  };

  // Append a result row and return its stable uid (safe under concurrency).
  const appendResult = (item: Omit<RunResult, 'uid'>): string => {
    const uid = String(++uidRef.current);
    setResults((prev) => [...prev, { uid, ...item }]);
    return uid;
  };
  const patchResult = (uid: string, patch: Partial<RunResult>) =>
    setResults((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const handleRunRandom = async () => {
    if (selectedIds.size === 0 || !envId || !deviceId) return;
    setRunning(true);
    stopRef.current = false;
    setResults([]);
    setLoadCycles(0);
    setLoadElapsed(0);

    const selected = (testCases || []).filter((tc: any) => selectedIds.has(tc.id));
    const isLoad = runMode === 'load';
    const startTime = Date.now();
    const durationMs = isLoad ? loadDurationMin * 60 * 1000 : 0;
    const concurrency = isLoad ? Math.max(1, Math.min(20, loadConcurrency)) : 1;
    const thinkMs = isLoad ? Math.max(0, loadThinkSec) * 1000 : 0;

    // Elapsed timer for load mode
    let elapsedInterval: NodeJS.Timeout | null = null;
    if (isLoad) {
      elapsedInterval = setInterval(() => {
        setLoadElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    let cyclesStarted = 0;
    let stopAll = false;
    const timeLeft = () => !isLoad || Date.now() - startTime < durationMs;
    const orderList = () =>
      loadOrder === 'random' ? [...selected].sort(() => Math.random() - 0.5) : [...selected];

    // Each virtual user loops over the selected tests until time/stop.
    const worker = async (workerId: number) => {
      let localPass = 0;
      do {
        if (stopRef.current || stopAll || !timeLeft()) break;
        localPass++;
        const myCycle = ++cyclesStarted;
        setLoadCycles(myCycle);
        const list = orderList();

        for (const tc of list) {
          if (stopRef.current || stopAll || !timeLeft()) break;
          const uid = appendResult({
            testCaseId: tc.id,
            title: `${isLoad ? (concurrency > 1 ? `[U${workerId + 1}·#${localPass}] ` : `[#${localPass}] `) : ''}${tc.title}`,
            runId: '',
            status: 'running',
            worker: workerId,
          });
          const { runId, status } = await runOneTest(tc);
          patchResult(uid, { runId, status: status as any });

          if (loadStopOnFailure && (status === 'failed' || status === 'error')) {
            stopAll = true;
            stopRef.current = true;
            break;
          }
          if (thinkMs && timeLeft() && !stopAll) await new Promise((r) => setTimeout(r, thinkMs));
        }
        // Single mode: one pass per worker. Load mode: loop until time expires.
      } while (isLoad && !stopAll && !stopRef.current && timeLeft());
    };

    await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));

    if (elapsedInterval) clearInterval(elapsedInterval);
    setLoadElapsed(Math.floor((Date.now() - startTime) / 1000));
    setRunning(false);
  };

  const handleStopLoad = () => {
    stopRef.current = true;
  };

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed' || r.status === 'error').length;
  const completedCount = passedCount + failedCount;
  const progressPct = results.length > 0 ? Math.round((completedCount / results.length) * 100) : 0;
  const throughput = loadElapsed > 0 ? completedCount / (loadElapsed / 60) : 0;
  const allFilteredSelected = filteredCases.length > 0 && filteredCases.every((tc: any) => selectedIds.has(tc.id));

  return (
    <AppLayout title="Automation">
      <div className="space-y-6">
        {/* Config */}
        <Card>
          <CardContent className="pt-5 pb-5 space-y-4">
            {/* Row 1: Env + Device */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Select
                  label="Environment"
                  options={(environments || []).map((e: any) => ({ label: e.name, value: e.id }))}
                  value={envId}
                  onChange={(e) => setEnvId(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Select
                  label="Device"
                  options={(devices || []).map((d: any) => ({ label: `${d.name} (${d.platform})`, value: d.id }))}
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Run mode + Duration + Button */}
            <div className="flex gap-3 items-end flex-wrap">
              {/* Mode toggle */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Mode</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setRunMode('single')}
                    className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                      runMode === 'single' ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground')}
                  >
                    <Play className="h-3.5 w-3.5" /> Single
                  </button>
                  <button
                    onClick={() => setRunMode('load')}
                    className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border',
                      runMode === 'load' ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground')}
                  >
                    <Repeat className="h-3.5 w-3.5" /> Load Test
                  </button>
                </div>
              </div>

              {/* Duration (load mode only) */}
              {runMode === 'load' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Duration</label>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      {DURATION_PRESETS.map((min) => (
                        <button
                          key={min}
                          onClick={() => setLoadDurationMin(min)}
                          className={cn('px-3 py-2 text-sm font-medium transition-colors border-l border-border first:border-l-0',
                            loadDurationMin === min ? 'bg-primary text-white' : 'bg-background text-muted-foreground hover:text-foreground')}
                        >
                          {fmtDuration(min)}
                        </button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={loadDurationMin}
                      onChange={(e) => setLoadDurationMin(Math.max(1, parseInt(e.target.value || '1', 10)))}
                      className="w-20"
                      title="Custom duration (minutes)"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              )}

              {runMode === 'load' && (
                <Button variant="outline" className="h-10" onClick={() => setShowAdvanced((v) => !v)}>
                  <Settings2 className="h-4 w-4" />
                  Advanced
                </Button>
              )}

              <div className="flex-1" />

              {/* Run / Stop button */}
              {running ? (
                <Button variant="destructive" onClick={handleStopLoad} className="h-10">
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={handleRunRandom}
                  disabled={selectedIds.size === 0 || !envId || !deviceId}
                  className="h-10"
                >
                  {runMode === 'load' ? <Repeat className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
                  {runMode === 'load'
                    ? `Load Test ${selectedIds.size}${loadConcurrency > 1 ? ` ×${loadConcurrency}` : ''} for ${fmtDuration(loadDurationMin)}`
                    : `Run ${selectedIds.size} Random`}
                </Button>
              )}
            </div>

            {/* Row 3: Advanced load options */}
            {runMode === 'load' && showAdvanced && (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Concurrency */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Users className="h-3.5 w-3.5" /> Concurrent users
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={loadConcurrency}
                      onChange={(e) => setLoadConcurrency(Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))))}
                    />
                    <p className="text-[11px] text-muted-foreground">Parallel runners (1–20)</p>
                  </div>

                  {/* Order */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Shuffle className="h-3.5 w-3.5" /> Order
                    </label>
                    <Select
                      options={[
                        { label: 'Random (shuffle)', value: 'random' },
                        { label: 'Sequential', value: 'sequential' },
                      ]}
                      value={loadOrder}
                      onChange={(e) => setLoadOrder(e.target.value as 'random' | 'sequential')}
                    />
                    <p className="text-[11px] text-muted-foreground">Per-cycle test order</p>
                  </div>

                  {/* Think time */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5" /> Think time
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={loadThinkSec}
                      onChange={(e) => setLoadThinkSec(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    />
                    <p className="text-[11px] text-muted-foreground">Delay between tests (sec)</p>
                  </div>

                  {/* Stop on failure */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Failure handling</label>
                    <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loadStopOnFailure}
                        onChange={(e) => setLoadStopOnFailure(e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm">Stop on first failure</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">Abort the whole run on a fail</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  Run Results
                  {loadCycles > 1 && <Badge variant="secondary" className="text-xs">Cycle {loadCycles}</Badge>}
                  {runMode === 'load' && loadConcurrency > 1 && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1"><Users className="h-3 w-3" />×{loadConcurrency}</Badge>
                  )}
                </span>
                <div className="flex gap-3 text-sm font-normal items-center">
                  {loadElapsed > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {Math.floor(loadElapsed / 60)}:{(loadElapsed % 60).toString().padStart(2, '0')}
                      {runMode === 'load' && <span className="text-muted-foreground/60">/ {fmtDuration(loadDurationMin)}</span>}
                    </span>
                  )}
                  {runMode === 'load' && throughput > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
                      <Gauge className="h-3.5 w-3.5" />{throughput.toFixed(1)}/min
                    </span>
                  )}
                  <span className="text-green-600 dark:text-green-400 font-medium">{passedCount} passed</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{failedCount} failed</span>
                  <span className="text-muted-foreground">/ {results.length}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Progress</span>
                  <span className="font-semibold text-foreground tabular-nums">{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="space-y-1.5">
                {results.map((r, idx) => (
                  <div
                    key={r.uid}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-4 py-2.5',
                      r.status === 'passed' ? 'border-green-200/60 bg-green-50/40 dark:border-green-900/40 dark:bg-green-950/10' :
                      r.status === 'failed' || r.status === 'error' ? 'border-red-200/60 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/10' :
                      'border-border/60',
                    )}
                    onClick={() => r.runId && router.push(`/tests/runs/${r.runId}`)}
                    style={{ cursor: r.runId ? 'pointer' : 'default' }}
                  >
                    <span className="text-xs text-muted-foreground w-6 tabular-nums font-medium">{idx + 1}</span>
                    {r.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" /> :
                     r.status === 'passed' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                     r.status === 'failed' || r.status === 'error' ? <XCircle className="h-4 w-4 text-red-500 shrink-0" /> :
                     <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                    <span className="text-sm truncate flex-1">{r.title}</span>
                    <Badge variant={
                      r.status === 'passed' ? 'success' : r.status === 'failed' || r.status === 'error' ? 'destructive' :
                      r.status === 'running' ? 'warning' : 'outline'
                    }>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories + Test Cases */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Category sidebar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                Categories
              </h3>
            </div>

            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                selectedCategory === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <span>All Tests</span>
              <Badge variant="secondary" className="text-xs tabular-nums">{(testCases || []).length}</Badge>
            </button>

            {categories.map((cat) => {
              const count = (testCases || []).filter((tc: any) => (tc.tags || []).includes(cat)).length;
              return (
                <div
                  key={cat}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                    selectedCategory === cat ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  onClick={() => setSelectedCategory(cat)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <Badge variant="secondary" className="text-xs tabular-nums shrink-0">{count}</Badge>
                  </div>
                </div>
              );
            })}

            {uncategorizedCount > 0 && (
              <button
                onClick={() => setSelectedCategory('uncategorized')}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedCategory === 'uncategorized' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <span className="italic">Uncategorized</span>
                <Badge variant="secondary" className="text-xs tabular-nums">{uncategorizedCount}</Badge>
              </button>
            )}

            {/* Add category */}
            {showNewCategory ? (
              <div className="pt-2 space-y-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleAddCategory} className="flex-1">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewCategory(true)}
                className="w-full flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors mt-2"
              >
                <Plus className="h-3.5 w-3.5" /> New Category
              </button>
            )}
          </div>

          {/* Test cases list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  {selectedCategory === 'all' ? 'All Tests' : selectedCategory === 'uncategorized' ? 'Uncategorized' : selectedCategory}
                </span>
                <div className="flex items-center gap-3">
                  {filteredCases.length > 0 && (
                    <button onClick={selectAllFiltered} className="text-sm text-primary hover:underline font-medium">
                      {allFilteredSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                  <Badge variant="secondary" className="tabular-nums">{selectedIds.size} selected</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCases ? (
                <div className="py-12 text-center">
                  <div className="inline-block h-7 w-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground mt-3">Loading...</p>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Zap className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-semibold">No test cases{selectedCategory !== 'all' ? ' in this category' : ''}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Record a session and use the Automation tab to create tests</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredCases.map((tc: any) => (
                    <div
                      key={tc.id}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all',
                        selectedIds.has(tc.id)
                          ? 'border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20'
                          : 'border-border/60 hover:border-primary/30',
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleSelect(tc.id)}
                        className={cn(
                          'h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          selectedIds.has(tc.id) ? 'border-primary bg-primary' : 'border-muted-foreground/30 group-hover:border-primary/50',
                        )}
                      >
                        {selectedIds.has(tc.id) && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0" onClick={() => toggleSelect(tc.id)}>
                        <p className="text-sm font-medium truncate">{tc.title}</p>
                        {tc.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{tc.description}</p>
                        )}
                      </div>

                      {/* Tags / category badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(tc.tags || []).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleRemoveCategory(tc.id, tag); }}
                          >
                            {tag} ×
                          </Badge>
                        ))}

                        {/* Assign category dropdown */}
                        {categories.length > 0 && (
                          <select
                            className="h-6 text-[10px] rounded border border-border bg-background px-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            value=""
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { if (e.target.value) handleAssignCategory(tc.id, e.target.value); e.target.value = ''; }}
                          >
                            <option value="">+ tag</option>
                            {categories.filter((c) => !(tc.tags || []).includes(c)).map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}

                        <Badge variant="secondary" className="text-[10px] tabular-nums">
                          {tc.steps?.length || 0} steps
                        </Badge>

                        <button
                          onClick={(e) => handleDeleteTestCase(tc.id, e)}
                          className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
