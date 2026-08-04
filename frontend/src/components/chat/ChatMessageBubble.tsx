import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import type { ChatSource } from '@/types';

export interface ChatTurn {
  id: string;
  question: string;
  answer: string;
  sources: ChatSource[];
  suggestedQuestions: string[];
  isStreaming: boolean;
  error?: string;
}

export function ChatMessageBubble({ turn, onAskSuggested }: { turn: ChatTurn; onAskSuggested: (question: string) => void }) {
  const isWaitingForFirstChunk = turn.isStreaming && !turn.answer;

  return (
    <div className="space-y-3 animate-slideIn">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
          {turn.question}
        </div>
      </div>

      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-border px-4 py-3 text-sm shadow-sm">
          {isWaitingForFirstChunk ? (
            <TypingIndicator />
          ) : turn.error ? (
            <p className="text-red-600">{turn.error}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.answer}</ReactMarkdown>
            </div>
          )}

          {!turn.isStreaming && turn.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
              {turn.sources.map((source, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="h-3 w-3" />
                  {source.documentName}
                  {source.page ? ` · p.${source.page}` : ''}
                </span>
              ))}
            </div>
          )}

          {!turn.isStreaming && turn.suggestedQuestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Suggested questions</p>
              <div className="flex flex-col gap-1.5 items-start">
                {turn.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onAskSuggested(q)}
                    className="text-left text-xs sm:text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
