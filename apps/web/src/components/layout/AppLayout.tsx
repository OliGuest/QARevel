'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        {title && (
          <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 header-border-gradient">
            <div className="flex h-16 items-center px-6 pl-16 lg:pl-8">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
            </div>
          </header>
        )}
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
