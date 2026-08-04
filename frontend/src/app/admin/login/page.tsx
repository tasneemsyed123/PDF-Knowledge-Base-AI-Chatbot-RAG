'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Auto-dismiss the toast after a few seconds. Keyed on shakeKey (which
  // increments on every failed attempt) rather than just `error` - back-to-
  // back attempts with the identical message ("Invalid email or password"
  // both times) are the same string value, so React skips re-running an
  // effect keyed only on `error`, leaving the ORIGINAL timer running. That
  // made the toast from a second attempt vanish almost immediately, since
  // it was really just the first timer finishing on schedule.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error, shakeKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/admin/auth/login', { email, password });
      login(data.data.accessToken, data.data.admin);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err));
      setShakeKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#EEF3FC] via-[#F5F8FE] to-[#FAFBFF] dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 px-4 py-8 sm:px-6 sm:py-12">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Toast notification */}
      {error && (
        <div className="fixed bottom-5 right-4 left-4 sm:left-auto z-50 flex sm:justify-end pointer-events-none">
          <div className="pointer-events-auto animate-toastInBottomRight flex items-start gap-3 rounded-2xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 shadow-[0_12px_35px_-8px_rgba(220,38,38,0.25)] px-4 py-3.5 max-w-sm w-full">
            <div className="h-8 w-8 shrink-0 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sign in failed</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss"
              className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-[420px] md:max-w-[460px]">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-[42px] font-extrabold text-blue-600 dark:text-blue-400 tracking-tight leading-none">
            KNOWLEDGE BASE ADMIN
          </h1>
          <p className="text-sm md:text-base text-[#6B7280] dark:text-slate-400 mt-2.5">PDF Base AI Chatbot</p>
        </div>

        <div
          key={shakeKey}
          className={cn(
            'bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgba(30,64,175,0.08)] dark:shadow-none border overflow-hidden transition-colors',
            error ? 'border-red-200 dark:border-red-500/30 animate-shake' : 'border-[#E7ECF6] dark:border-slate-800',
          )}
        >
          <div className={cn('h-1.5 bg-gradient-to-r', error ? 'from-red-400 via-red-500 to-red-600' : 'from-blue-500 via-blue-600 to-blue-700')} />

          <div className="px-6 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8 md:px-10 md:pt-10 md:pb-10">
            <h2 className="text-lg md:text-xl font-semibold text-[#111827] dark:text-slate-100 tracking-tight leading-tight mb-1">
              Admin sign in
            </h2>
            <p className="text-xs md:text-sm text-[#6B7280] dark:text-slate-400 mb-6 md:mb-7">
              Manage the knowledge base and monitor chatbot activity
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs md:text-sm font-medium text-[#374151] dark:text-slate-300 mb-1.5">Email address</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(error && 'border-red-300 focus-visible:ring-red-100 focus-visible:border-red-400')}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-[#374151] dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn('pr-10', error && 'border-red-300 focus-visible:ring-red-100 focus-visible:border-red-400')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] dark:hover:text-slate-300 transition-colors text-xs font-medium"
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full mt-2" size="lg">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="text-xs md:text-sm text-[#6B7280] dark:text-slate-400 text-center mt-6">
              No public registration - admin accounts are provisioned via the seed script.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
