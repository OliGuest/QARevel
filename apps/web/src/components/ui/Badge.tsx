'use client';

import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary text-primary-foreground',
  success: 'bg-success/15 text-success border border-success/30',
  destructive: 'bg-destructive/15 text-destructive border border-destructive/30',
  warning: 'bg-warning/15 text-warning border border-warning/30',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground',
};

interface BadgeProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
