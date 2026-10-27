import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: 'Ghostshift — Control',
  description: 'One human. A team of AI agents. From idea to deployment.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body><AppShell>{children}</AppShell></body></html>;
}
