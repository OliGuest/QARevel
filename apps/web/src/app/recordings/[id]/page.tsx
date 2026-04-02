'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Globe, Wifi, MousePointer, Terminal, Camera, FileText,
  ImageIcon, AlertTriangle, Zap, Play, Lightbulb, TrendingDown, Clock,
  Trash2, ExternalLink, ChevronRight, Activity, Shield, BarChart3, CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

// ── Helpers ──

function ScreenshotImage({ storageKey }: { storageKey: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('qarevel_access_token');
    if (!token || !storageKey) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const base = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
    fetch(`${base}/attachments/screenshot?key=${encodeURIComponent(storageKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => setSrc(URL.createObjectURL(blob))).catch(() => {});
  }, [storageKey]);
  if (!src) return <div className="flex h-40 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground"><ImageIcon className="h-8 w-8 opacity-30" /></div>;
  return <img src={src} alt="Error screenshot" className="rounded-xl border border-border object-contain w-full" />;
}

function fmtTime(eventTime: string, start: string): string {
  const diff = (new Date(eventTime).getTime() - new Date(start).getTime()) / 1000;
  if (diff < 60) return `${diff.toFixed(1)}s`;
  return `${Math.floor(diff / 60)}m ${Math.round(diff % 60)}s`;
}

function statusConfig(s: string) {
  switch (s?.toLowerCase()) {
    case 'completed': return { label: 'Completed', icon: CheckCircle2, pill: 'text-emerald-600 dark:text-emerald-400' };
    case 'running': return { label: 'Running', icon: Activity, pill: 'text-amber-600 dark:text-amber-400' };
    case 'stopping': return { label: 'Stopping', icon: Clock, pill: 'text-amber-600 dark:text-amber-400' };
    case 'error': return { label: 'Error', icon: AlertTriangle, pill: 'text-red-600 dark:text-red-400' };
    default: return { label: s || 'Unknown', icon: Clock, pill: 'text-muted-foreground' };
  }
}

function netColor(code: number | undefined) {
  if (!code) return '';
  if (code < 300) return 'text-emerald-600 dark:text-emerald-400';
  if (code < 400) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function generateSuggestions(net: any[], pages: any[], all: any[]) {
  const s: { icon: any; title: string; desc: string; severity: 'error' | 'warning' | 'info' }[] = [];
  const failed = (net || []).filter((e: any) => (e.data?.statusCode || 0) >= 400);
  if (failed.length) s.push({ icon: AlertTriangle, title: `${failed.length} failed request${failed.length > 1 ? 's' : ''}`, desc: failed.slice(0, 3).map((e: any) => `${e.data.method} …/${(e.data.url || '').split('/').pop()?.split('?')[0]} (${e.data.statusCode})`).join(', '), severity: 'error' });
  const slow = (net || []).filter((e: any) => (e.data?.responseTimeMs || 0) > 2000);
  if (slow.length) s.push({ icon: TrendingDown, title: `${slow.length} slow request${slow.length > 1 ? 's' : ''} (>2s)`, desc: slow.sort((a: any, b: any) => (b.data?.responseTimeMs || 0) - (a.data?.responseTimeMs || 0)).slice(0, 2).map((e: any) => `…/${(e.data.url || '').split('/').pop()?.split('?')[0]} (${e.data.responseTimeMs}ms)`).join(', '), severity: 'warning' });
  const slowP = (pages || []).filter((e: any) => (e.data?.loadCompleteMs || 0) > 3000);
  if (slowP.length) s.push({ icon: Clock, title: `${slowP.length} slow page load${slowP.length > 1 ? 's' : ''}`, desc: slowP.map((e: any) => `${(e.data.url || '').split('/').pop() || '/'} (${e.data.loadCompleteMs}ms)`).join(', '), severity: 'warning' });
  const errs = (all || []).filter((e: any) => e.type === 'console' && e.data?.level === 'error');
  if (errs.length) s.push({ icon: Terminal, title: `${errs.length} console error${errs.length > 1 ? 's' : ''}`, desc: errs.slice(0, 2).map((e: any) => (e.data.message || '').slice(0, 80)).join('; '), severity: 'error' });
  const big = (net || []).filter((e: any) => (e.data?.responseSize || 0) > 500000);
  if (big.length) s.push({ icon: Zap, title: `${big.length} large response${big.length > 1 ? 's' : ''}`, desc: 'Consider compression or pagination', severity: 'info' });
  if (!s.length) s.push({ icon: Lightbulb, title: 'Looking good!', desc: 'No major issues detected.', severity: 'info' });
  return s;
}

const sevStyle = {
  error: { bg: 'bg-red-500/10 border-red-500/20', icon: 'text-red-500', dot: 'bg-red-500' },
  warning: { bg: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-500', dot: 'bg-amber-500' },
  info: { bg: 'bg-blue-500/10 border-blue-500/20', icon: 'text-blue-500', dot: 'bg-blue-500' },
};

type Tab = 'timeline' | 'network' | 'performance' | 'errors' | 'automation';

const tabIcons: Record<Tab, any> = {
  timeline: Activity,
  network: Wifi,
  performance: BarChart3,
  errors: Shield,
  automation: Zap,
};

// ── Component ──

export default function RecordingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [creatingTest, setCreatingTest] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this recording?')) return;
    setDeleting(true);
    try { await api.deleteRecording(id); router.push('/recordings'); } catch { setDeleting(false); }
  };

  const { data: recording, isLoading } = useApi<any>(useCallback(() => api.getRecording(id), [id]));
  const { data: allEvents } = useApi<any[]>(useCallback(() => api.getRecordingEvents(id), [id]));
  const { data: networkEvents } = useApi<any[]>(useCallback(() => api.getRecordingEvents(id, 'network'), [id]));
  const { data: pageLoadEvents } = useApi<any[]>(useCallback(() => api.getRecordingEvents(id, 'page_load'), [id]));
  const { data: clickEvents } = useApi<any[]>(useCallback(() => api.getRecordingEvents(id, 'click'), [id]));

  const start = recording?.createdAt || '';
  const totalNet = networkEvents?.length || 0;
  const totalClicks = clickEvents?.length || 0;
  const totalPages = (allEvents || []).filter((e: any) => e.type === 'navigation').length;
  const errorEvents = (allEvents || []).filter((e: any) =>
    e.type === 'error' || (e.type === 'console' && e.data?.level === 'error') ||
    (e.type === 'network' && (e.data?.statusCode || 0) >= 400) ||
    (e.type === 'screenshot' && e.data?.trigger === 'error'));

  const sortedNet = [...(networkEvents || [])].sort((a, b) => (b.data?.responseTimeMs || 0) - (a.data?.responseTimeMs || 0));
  const maxLoad = Math.max(...(pageLoadEvents || []).map((e: any) => e.data?.loadCompleteMs || 0), 1);
  const suggestions = generateSuggestions(networkEvents || [], pageLoadEvents || [], allEvents || []);
  const avgResponseTime = totalNet > 0 ? Math.round((networkEvents || []).reduce((s: number, e: any) => s + (e.data?.responseTimeMs || 0), 0) / totalNet) : 0;

  const automationSteps = (allEvents || [])
    .filter((e: any) => e.type === 'navigation' || e.type === 'click')
    .map((e: any, idx: number) => e.type === 'navigation'
      ? { n: idx + 1, action: 'navigate', selector: e.data?.url || '', desc: `Navigate to ${e.data?.url || ''}` }
      : { n: idx + 1, action: 'click', selector: e.data?.selector || e.data?.targetTag || '', desc: `Click "${(e.data?.targetText || '').slice(0, 50)}"` });

  const handleCreateTest = async () => {
    if (!automationSteps.length) return;
    setCreatingTest(true);
    try {
      const tc = await api.createTestCase({ title: `Automated: ${recording?.environment?.name || 'Recording'} ${new Date().toLocaleDateString()}`, platform: 'web', type: 'automated', priority: 'medium', tags: ['recorded'], description: `From recording ${id}` } as any);
      for (const s of automationSteps) await api.addTestStep(tc.id, { stepNumber: s.n, action: s.action, selector: s.selector } as any);
      router.push(`/tests/${tc.id}`);
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setCreatingTest(false); }
  };

  if (isLoading) return (
    <AppLayout title="Recording">
      <div className="py-20 text-center"><div className="inline-block h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /><p className="text-sm text-muted-foreground mt-3">Loading...</p></div>
    </AppLayout>
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'timeline', label: 'Timeline', count: allEvents?.length || 0 },
    { key: 'network', label: 'Network', count: totalNet },
    { key: 'performance', label: 'Performance' },
    { key: 'errors', label: 'Errors', count: errorEvents.length },
    { key: 'automation', label: 'Automation', count: automationSteps.length },
  ];

  return (
    <AppLayout title="Recording Report">
      <div className="space-y-8">

        {/* ── Hero header ── */}
        {(() => {
          const sc = statusConfig(recording?.status);
          const StatusIcon = sc.icon;
          return (
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/recordings')} className="p-2 -ml-2 rounded-xl hover:bg-background/60 transition-colors">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold tracking-tight">{recording?.environment?.name || 'Recording'}</h1>
                  <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', sc.pill)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {sc.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  {recording?.environment?.baseUrl || ''}
                  <ExternalLink className="h-3 w-3" />
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDelete} loading={deleting} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Duration', value: recording?.summary?.durationMs ? formatDuration(recording.summary.durationMs) : '-', color: 'text-foreground' },
              { label: 'Pages', value: totalPages, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'API Calls', value: totalNet, color: 'text-purple-600 dark:text-purple-400' },
              { label: 'Errors', value: errorEvents.length, color: errorEvents.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Clicks', value: totalClicks, color: 'text-orange-600 dark:text-orange-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-background/80 border border-border/50 px-4 py-3 text-center">
                <p className={cn('text-2xl font-bold tabular-nums', stat.color)}>{stat.value}</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
          );
        })()}

        {/* ── Insights ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((s, i) => {
            const st = sevStyle[s.severity];
            return (
              <div key={i} className={cn('rounded-xl border p-4 flex gap-3', st.bg)}>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', s.severity === 'error' ? 'bg-red-500/20' : s.severity === 'warning' ? 'bg-amber-500/20' : 'bg-blue-500/20')}>
                  <s.icon className={cn('h-4 w-4', st.icon)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/50 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tabIcons[tab.key];
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
                  active ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground',
                  tab.key === 'errors' && (tab.count || 0) > 0 && !active ? 'text-red-500' : '',
                )}>
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn('text-xs tabular-nums rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    tab.key === 'errors' && (tab.count || 0) > 0 ? 'bg-red-500/15 text-red-600 dark:text-red-400' : '',
                  )}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Timeline ── */}
        {activeTab === 'timeline' && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {!allEvents?.length ? (
                <div className="py-20 text-center"><Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No events</p></div>
              ) : (
                <div className="divide-y divide-border/50">
                  {allEvents.map((ev: any, i: number) => {
                    const isErr = ev.type === 'error' || (ev.type === 'console' && ev.data?.level === 'error') || (ev.type === 'network' && (ev.data?.statusCode || 0) >= 400);
                    const d = ev.data || {};
                    let desc = '';
                    switch (ev.type) {
                      case 'navigation': desc = d.url || ''; break;
                      case 'network': desc = `${d.method || 'GET'} ${(d.url || '').split('?')[0].split('/').slice(-2).join('/')} → ${d.statusCode || '?'}`; break;
                      case 'click': desc = `<${d.targetTag}> "${(d.targetText || '').slice(0, 40)}"`; break;
                      case 'console': desc = (d.message || '').slice(0, 100); break;
                      case 'screenshot': desc = (d.errorMessage || 'Error screenshot').slice(0, 80); break;
                      case 'page_load': desc = `${(d.url || '').split('/').slice(-2).join('/')} — ${d.loadCompleteMs || '?'}ms`; break;
                      case 'error': desc = (d.message || '').slice(0, 100); break;
                      default: desc = ev.type;
                    }
                    const icons: Record<string, { icon: any; color: string }> = {
                      navigation: { icon: Globe, color: 'text-blue-500 bg-blue-500/10' },
                      network: { icon: Wifi, color: isErr ? 'text-red-500 bg-red-500/10' : 'text-purple-500 bg-purple-500/10' },
                      click: { icon: MousePointer, color: 'text-orange-500 bg-orange-500/10' },
                      console: { icon: Terminal, color: d.level === 'error' ? 'text-red-500 bg-red-500/10' : 'text-gray-500 bg-gray-500/10' },
                      screenshot: { icon: Camera, color: 'text-red-500 bg-red-500/10' },
                      page_load: { icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
                      error: { icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
                    };
                    const ic = icons[ev.type] || { icon: Globe, color: 'text-muted-foreground bg-muted' };
                    const Ic = ic.icon;
                    return (
                      <div key={ev.id || i} className={cn('flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30', isErr && 'bg-red-50/40 dark:bg-red-950/10')}>
                        <span className="text-[11px] font-mono text-muted-foreground w-12 text-right tabular-nums shrink-0">{fmtTime(ev.timestamp || ev.createdAt, start)}</span>
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', ic.color)}><Ic className="h-4 w-4" /></div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm truncate', isErr ? 'text-red-600 dark:text-red-400 font-medium' : '')}>{desc}</p>
                        </div>
                        {ev.type === 'network' && d.responseTimeMs && (
                          <span className={cn('text-xs tabular-nums font-medium shrink-0', (d.responseTimeMs || 0) > 2000 ? 'text-red-500' : (d.responseTimeMs || 0) > 500 ? 'text-amber-500' : 'text-muted-foreground')}>{d.responseTimeMs}ms</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Network ── */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3 text-center">
                <p className="text-xl font-bold tabular-nums">{totalNet}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3 text-center">
                <p className="text-xl font-bold tabular-nums">{avgResponseTime}ms</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg Time</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card px-4 py-3 text-center">
                <p className={cn('text-xl font-bold tabular-nums', errorEvents.filter((e: any) => e.type === 'network').length > 0 ? 'text-red-500' : 'text-emerald-500')}>{errorEvents.filter((e: any) => e.type === 'network').length}</p><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Failures</p>
              </div>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {!networkEvents?.length ? (
                  <div className="py-20 text-center"><Wifi className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No requests</p></div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-muted/30 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      <span className="w-16">Method</span><span className="flex-1">URL</span><span className="w-14 text-right">Status</span><span className="w-16 text-right">Time</span><span className="w-16 text-right">Size</span>
                    </div>
                    {sortedNet.map((ev: any, i: number) => {
                      const d = ev.data || {};
                      const url = (d.url || '').split('?')[0];
                      const short = url.split('/').slice(-3).join('/');
                      const fail = (d.statusCode || 0) >= 400;
                      return (
                        <div key={ev.id || i} className={cn('flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-muted/30 transition-colors', fail && 'bg-red-50/40 dark:bg-red-950/10')}>
                          <span className="w-16 shrink-0"><Badge variant="secondary" className="font-mono text-[10px]">{d.method || 'GET'}</Badge></span>
                          <span className="flex-1 min-w-0 font-mono text-xs text-muted-foreground truncate">{short}</span>
                          <span className={cn('w-14 text-right font-bold tabular-nums', netColor(d.statusCode))}>{d.statusCode || '-'}</span>
                          <span className={cn('w-16 text-right tabular-nums text-xs', (d.responseTimeMs || 0) > 2000 ? 'text-red-500 font-bold' : (d.responseTimeMs || 0) > 500 ? 'text-amber-500 font-medium' : 'text-muted-foreground')}>{d.responseTimeMs ? `${d.responseTimeMs}ms` : '-'}</span>
                          <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{d.responseSize ? `${(d.responseSize / 1024).toFixed(1)}K` : '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Performance ── */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Page Load Times</CardTitle></CardHeader>
              <CardContent>
                {!pageLoadEvents?.length ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No page load data</div>
                ) : (
                  <div className="space-y-5">
                    {pageLoadEvents.map((ev: any, i: number) => {
                      const d = ev.data || {};
                      const ms = d.loadCompleteMs || 0;
                      const pct = Math.max((ms / maxLoad) * 100, 3);
                      const color = ms > 3000 ? 'red' : ms > 1000 ? 'amber' : 'emerald';
                      return (
                        <div key={ev.id || i}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium truncate max-w-md">{(d.url || '').split('/').slice(-2).join('/') || '/'}</span>
                            <span className={cn('text-sm font-bold tabular-nums', `text-${color}-600 dark:text-${color}-400`)}>{ms}ms</span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', `bg-${color}-500`)} style={{ width: `${pct}%` }} />
                          </div>
                          {d.domContentLoadedMs && (
                            <p className="text-[10px] text-muted-foreground mt-1">DOM ready: {d.domContentLoadedMs}ms</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-amber-500" /> Slowest Requests</CardTitle></CardHeader>
              <CardContent>
                {sortedNet.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No data</p> : (
                  <div className="space-y-2">
                    {sortedNet.slice(0, 5).map((ev: any, i: number) => {
                      const d = ev.data || {};
                      return (
                        <div key={ev.id || i} className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                          <span className="text-lg font-bold text-muted-foreground/40 w-6 tabular-nums">{i + 1}</span>
                          <Badge variant="secondary" className="font-mono text-[10px] shrink-0">{d.method || 'GET'}</Badge>
                          <span className="text-xs font-mono text-muted-foreground truncate flex-1">{(d.url || '').split('?')[0].split('/').slice(-3).join('/')}</span>
                          <span className={cn('text-xs font-semibold tabular-nums', netColor(d.statusCode))}>{d.statusCode}</span>
                          <span className="text-sm font-bold tabular-nums min-w-[60px] text-right">{d.responseTimeMs}ms</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Errors ── */}
        {activeTab === 'errors' && (
          <div className="space-y-3">
            {!errorEvents.length ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-base font-semibold">No errors detected</h3>
                <p className="text-sm text-muted-foreground mt-1">Clean recording with no issues</p>
              </div>
            ) : (
              errorEvents.map((ev: any, i: number) => {
                const d = ev.data || {};
                return (
                  <Card key={ev.id || i} className="overflow-hidden">
                    <div className="flex">
                      <div className="w-1.5 bg-red-500 shrink-0" />
                      <CardContent className="pt-5 pb-5 flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md tabular-nums">{fmtTime(ev.timestamp || ev.createdAt, start)}</span>
                          <Badge variant="destructive" className="text-xs">
                            {ev.type === 'network' ? `HTTP ${d.statusCode}` : ev.type === 'console' ? 'Console' : 'Error'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {ev.type === 'network' ? `${d.method} ${(d.url || '').split('?')[0]}` :
                           ev.type === 'console' ? (d.message || '').slice(0, 200) :
                           (d.message || '').slice(0, 200)}
                        </p>
                        {d.url && ev.type === 'network' && (
                          <div className="font-mono text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 break-all">{d.url}</div>
                        )}
                        {d.storageKey && <ScreenshotImage storageKey={d.storageKey} />}
                      </CardContent>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ── Automation ── */}
        {activeTab === 'automation' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p>Recorded Actions</p>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">{automationSteps.length} steps captured</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!automationSteps.length ? (
                <div className="py-16 text-center"><MousePointer className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No actions recorded</p></div>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />
                    <div className="space-y-0.5">
                      {automationSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-xl px-2 py-2.5 hover:bg-muted/30 relative transition-colors">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5 text-sm font-bold text-primary shrink-0 z-10">
                            {step.n}
                          </div>
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                            step.action === 'navigate' ? 'bg-blue-500/10' : 'bg-orange-500/10')}>
                            {step.action === 'navigate' ? <Globe className="h-4 w-4 text-blue-500" /> : <MousePointer className="h-4 w-4 text-orange-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{step.desc}</p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">{step.action}: {step.selector}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateTest} loading={creatingTest} className="w-full h-11">
                    <Play className="h-4 w-4" />
                    Create Automated Test ({automationSteps.length} steps)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
