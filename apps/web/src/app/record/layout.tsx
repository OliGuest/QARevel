import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Start Testing',
  description: 'Start a new browser recording session',
};

export default function RecordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
