import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your QARevel preferences',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
