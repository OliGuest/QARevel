import type { Metadata } from 'next';
import { AppLayout } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of your QA testing activity and metrics',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Dashboard">{children}</AppLayout>;
}
