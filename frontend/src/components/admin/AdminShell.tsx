'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/documents', label: 'Documents' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container flex flex-wrap items-center justify-between gap-y-2 py-3">
          <div className="flex items-center gap-4 sm:gap-8">
            <span className="font-bold text-blue-600 text-sm sm:text-base whitespace-nowrap">
              <span className="sm:hidden">KB Admin</span>
              <span className="hidden sm:inline">Knowledge Base Admin</span>
            </span>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-2.5 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                    pathname === link.href ? 'bg-blue-50 text-blue-700' : 'text-muted-foreground hover:bg-slate-100',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[180px]">{admin?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                router.push('/admin/login');
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6 sm:py-8">{children}</main>
    </div>
  );
}
