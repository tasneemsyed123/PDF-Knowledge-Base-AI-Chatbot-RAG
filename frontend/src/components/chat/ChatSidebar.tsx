'use client';

import { useState } from 'react';
import { MessageSquarePlus, MessagesSquare, Search, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatSessionMeta } from '@/hooks/useChatSessions';

function SidebarBody({
  sessions,
  activeId,
  onNewChat,
  onSelectChat,
  onRemoveChat,
  onCloseMobile,
}: {
  sessions: ChatSessionMeta[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRemoveChat: (id: string) => void;
  onCloseMobile?: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = search.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(search.trim().toLowerCase()))
    : sessions;

  return (
    <div className="flex flex-col h-full w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-800">
      <div className="h-16 shrink-0 flex items-center gap-2.5 px-4 border-b border-slate-200/70 dark:border-slate-800">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-brand-glow shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate" title="PDF Base AI Chatbot">
          PDF Base AI Chatbot
        </p>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="ml-auto md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-3 space-y-1 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 pl-9 pr-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sessions.length > 0 && (
          <p className="px-2.5 pt-2 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recent</p>
        )}

        <div className="space-y-0.5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={cn(
                'group relative flex items-center rounded-xl transition-colors',
                s.id === activeId ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              <button
                onClick={() => onSelectChat(s.id)}
                className={cn(
                  'flex-1 min-w-0 text-left px-3 py-2.5 text-sm truncate',
                  s.id === activeId ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-300',
                )}
              >
                {s.title || 'New chat'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveChat(s.id);
                }}
                aria-label="Remove chat from list"
                title="Remove from list"
                className="opacity-0 group-hover:opacity-100 shrink-0 mr-1.5 p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {sessions.length > 0 && filtered.length === 0 && (
            <p className="px-3 py-6 text-xs text-center text-slate-400">No chats match your search.</p>
          )}

          {sessions.length === 0 && (
            <div className="px-3 py-8 text-center">
              <MessagesSquare className="h-5 w-5 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Your conversations will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
        <p className="text-2xs text-center text-muted-foreground">Built by Tasneem Akthar Syed</p>
      </div>
    </div>
  );
}

export function ChatSidebar(props: {
  sessions: ChatSessionMeta[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRemoveChat: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}) {
  const { isOpenMobile, onCloseMobile, ...rest } = props;

  return (
    <>
      <aside className="hidden md:flex shrink-0">
        <SidebarBody {...rest} />
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={onCloseMobile} />
          <div className="absolute inset-y-0 left-0 animate-slideInLeft">
            <SidebarBody {...rest} onCloseMobile={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  );
}
