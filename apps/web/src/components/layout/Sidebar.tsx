'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Circle,
  Film,
  Zap,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/components/layout/ThemeProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/record', label: 'Start Testing', icon: Circle },
  { href: '/recordings', label: 'Recordings', icon: Film },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary shrink-0">
      {initials}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-border/60">
        <img src="/logo.png" alt="QARevel" className="h-9 w-9 rounded-lg object-contain" />
        <span className="text-lg font-bold tracking-tight text-foreground">QARevel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
              )}
              <Icon className={cn(
                'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                !active && 'group-hover:scale-110',
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-4 pb-2">
        <div className="flex items-center rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Light theme"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Dark theme"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="System theme"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* User section */}
      <div className="border-t border-border/60 p-4">
        {user && (
          <div className="mb-3 flex items-center gap-3">
            <UserInitials name={user.displayName || user.email || 'U'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-40 rounded-lg border border-border bg-card p-2 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-full w-64 border-r border-border bg-card shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-6 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border/60 bg-card surface-gradient">
        {sidebarContent}
      </aside>
    </>
  );
}
