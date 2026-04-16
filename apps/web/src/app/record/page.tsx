'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Wifi,
  WifiOff,
  Plus,
  Play,
  Square,
  Globe,
  Activity,
  MousePointer,
  AlertCircle,
  Trash2,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  RectangleVertical,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi } from '@/hooks/useApi';
import { useRecordingSocket } from '@/hooks/useRecordingSocket';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Environment } from '@qarevel/shared-types';

type RecordingState = 'idle' | 'recording' | 'stopping';

const DEVICE_PROFILES = [
  { key: 'web-desktop',       label: 'Desktop',           platform: 'web',     icon: Monitor,            viewport: '1920×1080' },
  { key: 'web-mobile',        label: 'Mobile (iOS)',      platform: 'web',     icon: Smartphone,         viewport: '390×844' },
  { key: 'web-tablet',        label: 'Tablet (iPad)',     platform: 'web',     icon: Tablet,             viewport: '820×1180' },
  { key: 'web-kiosk-vertical',label: 'Kiosk Vertical',   platform: 'web',     icon: RectangleVertical,  viewport: '1080×1920' },
  { key: 'android-phone',     label: 'Android Phone',     platform: 'android', icon: Smartphone,         viewport: '412×915' },
  { key: 'android-tablet',    label: 'Android Tablet',    platform: 'android', icon: Tablet,             viewport: '800×1280' },
] as const;

export default function RecordPage() {
  const router = useRouter();
  const envsFetcher = useCallback(() => api.getEnvironments(), []);
  const { data: environments, isLoading, refetch } = useApi<Environment[]>(envsFetcher);

  const [state, setState] = useState<RecordingState>('idle');
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState('web-desktop');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [recordingName, setRecordingName] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('0:00');
  const [error, setError] = useState('');

  // Inline add environment
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvType, setNewEnvType] = useState<'remote' | 'local'>('remote');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvUrl, setNewEnvUrl] = useState('');
  const [addingEnv, setAddingEnv] = useState(false);

  const handleAddEnv = async () => {
    if (!newEnvName.trim() || !newEnvUrl.trim()) return;
    setAddingEnv(true);
    try {
      let baseUrl = newEnvUrl.trim();
      // Auto-prefix http:// for bare IPs and hostnames
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      await api.createEnvironment({ name: newEnvName, type: newEnvType, baseUrl } as any);
      setNewEnvName('');
      setNewEnvUrl('');
      setNewEnvType('remote');
      setShowAddEnv(false);
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to add environment');
    } finally {
      setAddingEnv(false);
    }
  };

  const handleDeleteEnv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteEnvironment(id);
      if (selectedEnvId === id) setSelectedEnvId(null);
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const { stats, isStopped, isConnected } = useRecordingSocket(recordingId);

  useEffect(() => {
    if (state !== 'recording' || !startedAt) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [state, startedAt]);

  useEffect(() => {
    if (isStopped && recordingId) {
      router.push(`/recordings/${recordingId}`);
    }
  }, [isStopped, recordingId, router]);

  const handleLaunch = async () => {
    if (!selectedEnvId) return;
    setError('');
    try {
      const isAndroid = selectedDevice.startsWith('android-');
      const result = await api.startRecording({
        environmentId: selectedEnvId,
        name: recordingName.trim() || undefined,
        deviceProfile: selectedDevice,
        deviceSerial: isAndroid && deviceSerial.trim() ? deviceSerial.trim() : undefined,
      });
      setRecordingId(result.id);
      setStartedAt(new Date());
      setState('recording');
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
    }
  };

  const handleStop = async () => {
    if (!recordingId) return;
    setState('stopping');
    try {
      await api.stopRecording(recordingId);
    } catch (err: any) {
      setError(err.message || 'Failed to stop recording');
      setTimeout(() => router.push(`/recordings/${recordingId}`), 2000);
    }
  };

  const selectedEnv = environments?.find((e) => e.id === selectedEnvId);

  // ── IDLE ──
  if (state === 'idle') {
    return (
      <AppLayout title="Start Testing">
        <div className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Environment list */}
          <div className="space-y-1.5">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(environments || []).map((env) => (
                  <div
                    key={env.id}
                    onClick={() => setSelectedEnvId(env.id)}
                    className={cn(
                      'group relative rounded-xl border px-5 py-4 cursor-pointer transition-all',
                      selectedEnvId === env.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-accent/50',
                    )}
                  >
                    {/* Radio dot top-right */}
                    <div className={cn(
                      'absolute top-3 right-3 h-4 w-4 rounded-full border-2 transition-colors flex items-center justify-center',
                      selectedEnvId === env.id ? 'border-primary' : 'border-muted-foreground/30',
                    )}>
                      {selectedEnvId === env.id && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => handleDeleteEnv(env.id, e)}
                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <p className="text-sm font-semibold truncate pr-6">{env.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{env.baseUrl}</p>
                    <Badge variant="secondary" className="text-[10px] mt-2">
                      {String(env.type).toUpperCase() === 'LOCAL' ? 'Local Device' : env.type}
                    </Badge>
                  </div>
                ))}
                </div>

                {/* Add new - inline */}
                {showAddEnv ? (
                  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 space-y-3">
                    {/* Type toggle */}
                    <div className="flex gap-1 p-0.5 rounded-lg bg-muted/60 w-fit">
                      <button
                        onClick={() => setNewEnvType('remote')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          newEnvType === 'remote' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Globe className="h-3 w-3" /> Remote
                      </button>
                      <button
                        onClick={() => setNewEnvType('local')}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          newEnvType === 'local' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Monitor className="h-3 w-3" /> Local Device
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder={newEnvType === 'local' ? 'Name (e.g. Kiosk #3, My Phone)' : 'Name (e.g. POS3 Staging)'}
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                      />
                      <Input
                        placeholder={newEnvType === 'local' ? 'IP or hostname (e.g. 192.168.0.50:8080)' : 'URL (e.g. https://pos3.staging.revelapps.com)'}
                        value={newEnvUrl}
                        onChange={(e) => setNewEnvUrl(e.target.value)}
                      />
                    </div>
                    {newEnvType === 'local' && newEnvUrl && !newEnvUrl.startsWith('http') && (
                      <p className="text-[11px] text-muted-foreground">
                        Will connect to <span className="font-mono text-foreground">http://{newEnvUrl}</span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddEnv} loading={addingEnv}>
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowAddEnv(false); setNewEnvName(''); setNewEnvUrl(''); setNewEnvType('remote'); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddEnv(true)}
                    className="flex items-center gap-2 w-full rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Environment
                  </button>
                )}
              </>
            )}
          </div>

          {/* Device profile + Session name + Launch */}
          {selectedEnvId && (
            <div className="space-y-4">
              {/* Device profile picker */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Device Profile</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEVICE_PROFILES.map((profile) => {
                    const Icon = profile.icon;
                    const selected = selectedDevice === profile.key;
                    return (
                      <button
                        key={profile.key}
                        onClick={() => setSelectedDevice(profile.key)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                          selected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/40 hover:bg-accent/50',
                        )}
                      >
                        <Icon className={cn('h-5 w-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                        <div className="min-w-0">
                          <p className={cn('text-sm font-medium truncate', selected ? 'text-primary' : 'text-foreground')}>{profile.label}</p>
                          <p className="text-[11px] text-muted-foreground">{profile.viewport}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Android device connection */}
              {selectedDevice.startsWith('android-') && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Android device required — connect via USB or Wi-Fi ADB
                  </p>
                  <Input
                    placeholder="Device serial or IP (leave empty for auto-detect)"
                    value={deviceSerial}
                    onChange={(e) => setDeviceSerial(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    USB: connect device with USB debugging on. Wi-Fi: run <span className="font-mono">adb connect 192.168.x.x:5555</span> first.
                  </p>
                </div>
              )}

              <Input
                placeholder="Session name (e.g. Login flow, Checkout test...)"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
              />
              <Button className="w-full h-11" onClick={handleLaunch}>
                <Play className="h-4 w-4" />
                {selectedDevice.startsWith('android-')
                  ? `Launch on Android — ${selectedEnv?.name}`
                  : `Launch Browser — ${selectedEnv?.name}`}
              </Button>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── RECORDING ──
  if (state === 'recording') {
    return (
      <AppLayout title="Recording">
        <div className="space-y-5">
          {/* Status bar */}
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-medium">REC</span>
              <span className="font-mono text-sm font-bold tabular-nums">{elapsed}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isConnected ? (
                <><Wifi className="h-3.5 w-3.5 text-green-500" /> Connected</>
              ) : (
                <><WifiOff className="h-3.5 w-3.5" /> Offline</>
              )}
            </div>
          </div>

          {/* Environment + device info */}
          {selectedEnv && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedEnv.name}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-muted-foreground font-mono text-xs truncate">{selectedEnv.baseUrl}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
              <Badge variant="secondary" className="text-[10px] ml-1">
                {DEVICE_PROFILES.find(p => p.key === selectedDevice)?.label || selectedDevice}
              </Badge>
            </div>
          )}

          {/* Live stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-muted-foreground">Pages</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{stats.pagesVisited}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Activity className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs text-muted-foreground">Requests</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{stats.networkRequests}</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MousePointer className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs text-muted-foreground">Clicks</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{stats.clicks}</p>
            </div>
          </div>

          {/* Browser view via noVNC */}
          <div className="rounded-lg border border-border overflow-hidden bg-black">
            <iframe
              src={`${window.location.protocol}//${window.location.hostname}:6080/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000`}
              className="w-full border-0"
              style={{ height: '70vh' }}
              allow="clipboard-read; clipboard-write"
            />
          </div>

          {/* Stop */}
          <Button variant="destructive" className="w-full h-11" onClick={handleStop}>
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Browse the app in the browser above. Network requests, clicks, and errors are being captured.
          </p>
        </div>
      </AppLayout>
    );
  }

  // ── STOPPING ──
  return (
    <AppLayout title="Recording">
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm font-medium">Finishing recording...</p>
        <p className="text-xs text-muted-foreground">Processing captured events</p>
        {error && (
          <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mx-auto max-w-md">
            {error}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
