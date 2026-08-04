/**
 * app/layout.tsx
 * --------------------------------------------------------------------------
 * Root layout: wraps the whole app in the React Query provider, reused from
 * AItask_assignment.
 */
import type { Metadata } from 'next';
import { AppQueryProvider } from '@/lib/queryClient';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Knowledge Base AI Chatbot',
  description: 'Ask questions about admin-uploaded PDFs, answered by a RAG chatbot.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
