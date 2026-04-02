'use client';

import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  busy: 'bg-warning',
  error: 'bg-destructive',
  passed: 'bg-success',
  failed: 'bg-destructive',
  running: 'bg-primary',
  pending: 'bg-muted-foreground',
  healthy: 'bg-success',
  generating: 'bg-warning',
  ready: 'bg-success',
  cancelled: 'bg-muted-foreground',
  skipped: 'bg-warning',
};

interface StatusDotProps {
  status: string;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const color = statusColors[status.toLowerCase()] || 'bg-muted-foreground';
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', color, className)}
      title={status}
    />
  );
}
