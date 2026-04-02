'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Circle, Clock, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { formatDuration, getRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statStyles = [
  { border: 'stat-blue', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600 dark:text-blue-400' },
  { border: 'stat-green', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  { border: 'stat-amber', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
  { border: 'stat-purple', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
];

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  style,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  style: (typeof statStyles)[number];
}) {
  return (
    <Card className={cn('overflow-hidden', style.border)}>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('rounded-xl p-3', style.iconBg)}>
            <Icon className={cn('h-6 w-6', style.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function statusDotClass(status: string) {
  switch (status?.toLowerCase()) {
    case 'running': return 'status-dot status-dot-running';
    case 'completed': return 'status-dot status-dot-completed';
    case 'error': return 'status-dot status-dot-error';
    case 'stopping': return 'status-dot status-dot-stopping';
    default: return 'status-dot status-dot-idle';
  }
}

function statusBadgeVariant(status: string) {
  switch (status?.toLowerCase()) {
    case 'running': return 'warning' as const;
    case 'completed': return 'success' as const;
    case 'error': return 'destructive' as const;
    case 'stopping': return 'secondary' as const;
    default: return 'outline' as const;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const recordingsFetcher = useCallback(() => api.getRecordings(), []);
  const { data: recordings } = useApi<any[]>(recordingsFetcher);

  const totalRecordings = recordings?.length ?? 0;
  const activeRecordings = recordings?.filter((r: any) => r.status === 'running').length ?? 0;
  const todayRecordings = recordings?.filter((r: any) => {
    const d = new Date(r.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length ?? 0;

  const completedRecordings = recordings?.filter((r: any) => r.status === 'completed' && r.durationMs) ?? [];
  const avgDuration = completedRecordings.length > 0
    ? Math.round(completedRecordings.reduce((sum: number, r: any) => sum + (r.durationMs || 0), 0) / completedRecordings.length)
    : 0;

  const recentRecordings = recordings?.slice(0, 10) ?? [];

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="hero-gradient rounded-xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBvcGFjaXR5PSIuMDUiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ready to test?</h2>
            <p className="text-white/80 mt-1 text-sm">
              Start a new testing session to record browser interactions, network requests, and screenshots.
            </p>
          </div>
          <Button
            className="bg-white text-primary hover:bg-white/90 shadow-lg shrink-0 font-semibold"
            onClick={() => router.push('/record')}
          >
            <Circle className="h-4 w-4" />
            Start Testing
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Recordings"
          value={totalRecordings}
          icon={Film}
          style={statStyles[0]}
        />
        <StatsCard
          title="Active Now"
          value={activeRecordings}
          icon={Activity}
          style={statStyles[1]}
        />
        <StatsCard
          title="Today"
          value={todayRecordings}
          icon={Circle}
          style={statStyles[2]}
        />
        <StatsCard
          title="Avg Duration"
          value={avgDuration > 0 ? formatDuration(avgDuration) : '-'}
          icon={Clock}
          style={statStyles[3]}
        />
      </div>

      {/* Recent recordings table */}
      <Card>
        <div className="flex items-center justify-between p-6 pb-0">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Recent Recordings</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Latest testing sessions</p>
          </div>
          {recentRecordings.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/recordings')}>
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <CardContent className="pt-4">
          {recentRecordings.length === 0 ? (
            <div className="py-12 text-center">
              <Film className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recordings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a testing session to see data here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRecordings.map((rec: any) => (
                  <TableRow
                    key={rec.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/recordings/${rec.id}`)}
                  >
                    <TableCell className="text-sm text-muted-foreground">
                      {getRelativeTime(rec.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {rec.environment?.name || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rec.durationMs ? formatDuration(rec.durationMs) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={statusDotClass(rec.status)} />
                        <span className="text-sm capitalize">{rec.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
