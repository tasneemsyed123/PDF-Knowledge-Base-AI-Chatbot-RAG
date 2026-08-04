'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, LogOut, Sparkles, Loader2, Activity, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/documents', label: 'Documents', icon: FileText },
  { href: '/admin/monitoring', label: 'API Monitoring', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
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
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        Loading…
      </div>
    );
  }

  const initials = (admin?.name || admin?.email || 'A')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  function handleLogout() {
    logout();
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Ambient wash behind the sidebar/topbar, matching the public chat surface */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 border-r border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200/70 dark:border-slate-800">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-brand-glow shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate" title="PDF Base AI Chatbot">
              PDF Base AI Chatbot
            </p>
            <p className="text-2xs text-muted-foreground leading-tight">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{admin?.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{admin?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
            <ThemeToggle className="h-9 w-9 shrink-0" />
          </div>
          <p className="text-2xs text-center text-muted-foreground pt-1">Built by Tasneem Akthar Syed</p>
        </div>
      </aside>

      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="md:hidden border-b border-border bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-10">
          <div className="container flex flex-wrap items-center justify-between gap-y-2 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-blue-600 text-sm whitespace-nowrap">KB Admin</span>
            </div>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                    pathname === link.href
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <ThemeToggle className="h-9 w-9 bg-transparent border-none shadow-none" />
              <button
                onClick={handleLogout}
                className="px-2.5 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Log out
              </button>
            </nav>
          </div>
        </header>

        <main className="flex-1 container py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
