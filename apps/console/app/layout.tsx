import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ghostshift — Control',
  description: 'One human. A team of AI agents. From idea to deployment.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
