import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Automation',
  description: 'Manage and run automated test suites',
};

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
