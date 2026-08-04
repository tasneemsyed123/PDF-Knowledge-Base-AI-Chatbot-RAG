'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Menu, MessageSquarePlus, Sparkles } from 'lucide-react';
import { ChatMessageBubble, type ChatTurn } from '@/components/chat/ChatMessageBubble';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useChatSessions } from '@/hooks/useChatSessions';
import { streamChatAnswer } from '@/lib/chatStream';
import { apiClient } from '@/lib/apiClient';
import type { ChatMessageRecord } from '@/types';

const STARTER_PROMPTS = [
  'Summarize the key points from the knowledge base',
  'What documents are currently available?',
  'What is the refund policy?',
];

export default function PublicChatPage() {
  const { sessions, activeId, newChat, selectChat, removeChat, touchSession } = useChatSessions();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setTurns([]);
    setIsLoadingHistory(true);

    (async () => {
      try {
        const { data } = await apiClient.get<{ data: ChatMessageRecord[] }>(`/chat/history/${activeId}`);
        if (!cancelled && data.data.length > 0) {
          setTurns(
            data.data.map((m) => ({
              id: m._id,
              question: m.question,
              answer: m.answer,
              sources: m.sources ?? [],
              suggestedQuestions: m.suggestedQuestions ?? [],
              isStreaming: false,
            })),
          );
        }
      } catch {
        // Fresh chat with no history yet - not an error.
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !activeId || isBusy) return;

    touchSession(activeId, trimmed);

    const id = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      { id, question: trimmed, answer: '', sources: [], suggestedQuestions: [], isStreaming: true },
    ]);
    setInput('');
    setIsBusy(true);

    const update = (patch: Partial<ChatTurn>) =>
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

    await streamChatAnswer(activeId, trimmed, {
      onChunk: (content) => setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, answer: t.answer + content } : t))),
      onDone: (sources, suggestedQuestions) => update({ sources, suggestedQuestions, isStreaming: false }),
      onError: (message) => update({ error: message, isStreaming: false }),
    });

    setIsBusy(false);
  }

  function handleNewChat() {
    newChat();
    setIsSidebarOpen(false);
  }

  function handleSelectChat(id: string) {
    selectChat(id);
    setIsSidebarOpen(false);
  }

  return (
    <div className="h-[100dvh] flex chat-surface relative overflow-hidden">
      {/* Decorative ambient glows - purely cosmetic, sit behind everything */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-indigo-400/15 blur-3xl" />
      </div>

      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onRemoveChat={removeChat}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Desktop-only floating toggle - the mobile header carries its own copy */}
      <div className="hidden md:block fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="md:hidden shrink-0 border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex h-14 items-center gap-2 px-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
              className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate" title="PDF Base AI Chatbot">
              PDF Base AI Chatbot
            </p>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle className="h-9 w-9 bg-transparent border-none shadow-none" />
              <button
                onClick={handleNewChat}
                aria-label="New chat"
                className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {isLoadingHistory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <p className="text-xs">Loading your conversation…</p>
          </div>
        ) : turns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-6 sm:-mt-10">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-800 dark:text-slate-100 text-center tracking-tight mb-7 sm:mb-9 animate-fadeIn">
              What would you like to know?
            </h1>
            <div className="w-full max-w-2xl">
              <ChatComposer value={input} onChange={setInput} onSubmit={() => ask(input)} disabled={isBusy || !activeId} autoFocus />
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 mt-6 w-full max-w-xl">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => ask(prompt)}
                  className="text-left sm:text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/40 hover:text-blue-700 dark:hover:text-blue-300 hover:-translate-y-0.5 transition-all duration-150"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="container max-w-3xl py-8 space-y-6">
                {turns.map((turn) => (
                  <ChatMessageBubble key={turn.id} turn={turn} onAskSuggested={ask} />
                ))}
              </div>
            </div>

            <div className="shrink-0 relative">
              {/* Soft fade so the message list doesn't end abruptly under the composer */}
              <div className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-slate-50/90 dark:from-slate-950/90 to-transparent" />

              <div className="container max-w-3xl pt-1 pb-5 sm:pb-7">
                <ChatComposer value={input} onChange={setInput} onSubmit={() => ask(input)} disabled={isBusy || !activeId} />
                <p className="text-2xs text-center text-muted-foreground mt-2.5">
                  Answers are generated from uploaded PDFs and may not always be accurate.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
