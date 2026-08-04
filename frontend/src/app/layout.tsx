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
  title: 'PDF Base AI Chatbot',
  description: 'Ask questions about admin-uploaded PDFs, answered by a RAG chatbot.',
};

// Runs before React hydrates so the `dark` class is already correct on the
// very first paint - without this, the page would flash light mode for a
// moment even when the user has dark mode saved.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('kbTheme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
