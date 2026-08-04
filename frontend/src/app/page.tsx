'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatMessageBubble, type ChatTurn } from '@/components/chat/ChatMessageBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSessionId } from '@/hooks/useSessionId';
import { streamChatAnswer } from '@/lib/chatStream';

export default function PublicChatPage() {
  const sessionId = useSessionId();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !sessionId || isBusy) return;

    const id = crypto.randomUUID();
    setTurns((prev) => [
      ...prev,
      { id, question: trimmed, answer: '', sources: [], suggestedQuestions: [], isStreaming: true },
    ]);
    setInput('');
    setIsBusy(true);

    const update = (patch: Partial<ChatTurn>) =>
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

    await streamChatAnswer(sessionId, trimmed, {
      onChunk: (content) => setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, answer: t.answer + content } : t))),
      onDone: (sources, suggestedQuestions) => update({ sources, suggestedQuestions, isStreaming: false }),
      onError: (message) => update({ error: message, isStreaming: false }),
    });

    setIsBusy(false);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="container flex h-16 items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Knowledge Base Assistant</p>
            <p className="text-xs text-muted-foreground">Ask anything about the uploaded documents</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-6">
          {turns.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-blue-300" />
              <p className="font-medium">Ask me anything about the knowledge base</p>
              <p className="text-sm mt-1">I'll answer using the documents the admin has uploaded.</p>
            </div>
          ) : (
            turns.map((turn) => <ChatMessageBubble key={turn.id} turn={turn} onAskSuggested={ask} />)
          )}
        </div>
      </div>

      <div className="border-t border-border bg-white">
        <form
          className="container max-w-3xl py-4 flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="Ask a question about the uploaded documents…"
            rows={1}
            className="flex-1"
            disabled={isBusy || !sessionId}
          />
          <Button type="submit" size="icon" disabled={isBusy || !input.trim() || !sessionId}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
