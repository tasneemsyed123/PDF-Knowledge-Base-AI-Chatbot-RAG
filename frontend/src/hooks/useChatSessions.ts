/**
 * hooks/useChatSessions.ts
 * --------------------------------------------------------------------------
 * Client-side registry of chat conversations for the sidebar (title, last
 * activity), plus which one is currently active. Backed by localStorage so
 * the list and the open conversation persist across reloads/tabs, unlike
 * the old sessionStorage-per-tab model. The backend has no concept of a
 * "chat list" - it only stores messages under a sessionId - so this is
 * purely a client-side index into sessionIds the backend already recognizes
 * via GET /chat/history/:sessionId.
 */
import { useCallback, useEffect, useState } from 'react';

export interface ChatSessionMeta {
  id: string;
  title: string;
  updatedAt: number;
}

const SESSIONS_KEY = 'kbChatSessions';
const ACTIVE_KEY = 'kbActiveChatId';

function readSessions(): ChatSessionMeta[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ChatSessionMeta[]) : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: ChatSessionMeta[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(readSessions());
    let active = localStorage.getItem(ACTIVE_KEY);
    if (!active) {
      active = crypto.randomUUID();
      localStorage.setItem(ACTIVE_KEY, active);
    }
    setActiveId(active);
  }, []);

  const newChat = useCallback(() => {
    const id = crypto.randomUUID();
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  const selectChat = useCallback((id: string) => {
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
  }, []);

  const removeChat = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        writeSessions(next);
        return next;
      });
      if (activeId === id) {
        const next = crypto.randomUUID();
        localStorage.setItem(ACTIVE_KEY, next);
        setActiveId(next);
      }
    },
    [activeId],
  );

  /** Registers a chat's first question as its title, or just bumps recency if it already has one. */
  const touchSession = useCallback((id: string, firstQuestion: string) => {
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === id);
      const next = existing
        ? prev.map((s) => (s.id === id ? { ...s, updatedAt: Date.now() } : s))
        : [
            { id, title: firstQuestion.length > 48 ? `${firstQuestion.slice(0, 48)}…` : firstQuestion, updatedAt: Date.now() },
            ...prev,
          ];
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      writeSessions(next);
      return next;
    });
  }, []);

  return { sessions, activeId, newChat, selectChat, removeChat, touchSession };
}
