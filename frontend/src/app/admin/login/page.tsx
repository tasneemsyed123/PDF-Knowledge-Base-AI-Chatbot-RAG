'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#EEF3FC] via-[#F5F8FE] to-[#FAFBFF] px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-[420px] md:max-w-[460px]">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-[42px] font-extrabold text-blue-600 tracking-tight leading-none">
            KNOWLEDGE BASE ADMIN
          </h1>
          <p className="text-sm md:text-base text-[#6B7280] mt-2.5">PDF Knowledge Base AI Chatbot</p>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(30,64,175,0.08)] border border-[#E7ECF6] overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />

          <div className="px-6 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8 md:px-10 md:pt-10 md:pb-10">
            <h2 className="text-lg md:text-xl font-semibold text-[#111827] tracking-tight leading-tight mb-1">
              Admin sign in
            </h2>
            <p className="text-xs md:text-sm text-[#6B7280] mb-6 md:mb-7">
              Manage the knowledge base and monitor chatbot activity
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700 animate-fadeIn">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs md:text-sm font-medium text-[#374151] mb-1.5">Email address</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-[#374151] mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors text-xs font-medium"
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

            <p className="text-xs md:text-sm text-[#6B7280] text-center mt-6">
              No public registration - admin accounts are provisioned via the seed script.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
