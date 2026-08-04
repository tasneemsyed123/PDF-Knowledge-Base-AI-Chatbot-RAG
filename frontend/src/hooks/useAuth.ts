/**
 * hooks/useAuth.ts
 * --------------------------------------------------------------------------
 * Minimal client-side admin auth state, backed by localStorage. Adapted
 * from AItask_assignment - same access-token-only approach.
 */
import { useState, useEffect, useCallback } from 'react';
import type { AdminUser } from '@/types';

export function useAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('admin');
    if (stored) setAdmin(JSON.parse(stored));
    setIsLoading(false);
  }, []);

  const login = useCallback((accessToken: string, nextAdmin: AdminUser) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('admin', JSON.stringify(nextAdmin));
    setAdmin(nextAdmin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('admin');
    setAdmin(null);
  }, []);

  return { admin, isLoading, login, logout, isAuthenticated: !!admin };
}
