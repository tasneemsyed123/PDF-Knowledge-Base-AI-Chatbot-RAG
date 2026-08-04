/**
 * hooks/useSessionId.ts
 * --------------------------------------------------------------------------
 * Public chat needs no login, but the backend still groups messages by a
 * client-generated session id so LangGraph gets conversation memory. Kept
 * in sessionStorage (not localStorage) so each new tab starts a fresh
 * conversation, matching normal ChatGPT-style behavior.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'chatSessionId';

export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let existing = sessionStorage.getItem(STORAGE_KEY);
    if (!existing) {
      existing = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, existing);
    }
    setSessionId(existing);
  }, []);

  return sessionId;
}
