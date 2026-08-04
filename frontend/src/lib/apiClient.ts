/**
 * lib/apiClient.ts
 * --------------------------------------------------------------------------
 * Single Axios instance for the whole frontend. Attaches the admin access
 * token (from localStorage) to every request, and normalizes error
 * responses. On 401, clears the token and redirects to /admin/login - only
 * admin routes require auth, so this never fires for the public chat.
 */
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('admin');
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
