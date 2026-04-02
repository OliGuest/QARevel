import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy HH:mm');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  switch (s) {
    case 'online':
    case 'passed':
    case 'ready':
    case 'healthy':
    case 'success':
      return 'text-success';
    case 'offline':
    case 'pending':
    case 'cancelled':
      return 'text-muted-foreground';
    case 'busy':
    case 'warning':
    case 'generating':
    case 'skipped':
      return 'text-warning';
    case 'error':
    case 'failed':
    case 'destructive':
      return 'text-destructive';
    case 'running':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
}
