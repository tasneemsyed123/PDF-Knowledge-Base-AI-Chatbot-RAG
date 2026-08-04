import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, FileText, Share2, Sparkles, ArrowUpRight } from 'lucide-react';
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

/**
 * Sources arrive as one entry per (document, page) chunk that was cited -
 * e.g. 3 chunks from the same PDF's pages 4, 5, 7 are 3 separate entries.
 * Rendered one-for-one that reads as "3 documents" when it's really 1
 * document cited on 3 pages, so group by document name and list its pages
 * together instead.
 */
function groupSourcesByDocument(sources: ChatSource[]): { documentName: string; pages: number[] }[] {
  const byDocument = new Map<string, Set<number>>();
  for (const source of sources) {
    const pages = byDocument.get(source.documentName) ?? new Set<number>();
    if (source.page) pages.add(source.page);
    byDocument.set(source.documentName, pages);
  }
  return Array.from(byDocument.entries()).map(([documentName, pages]) => ({
    documentName,
    pages: Array.from(pages).sort((a, b) => a - b),
  }));
}

export function ChatMessageBubble({ turn, onAskSuggested }: { turn: ChatTurn; onAskSuggested: (question: string) => void }) {
  const isWaitingForFirstChunk = turn.isStreaming && !turn.answer;
  const groupedSources = groupSourcesByDocument(turn.sources);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(turn.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    const shareText = `Q: ${turn.question}\n\nA: ${turn.answer}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PDF Base AI Chatbot', text: shareText });
      } catch {
        // User dismissed the share sheet - not an error.
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="space-y-4 animate-slideIn">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2.5 text-sm shadow-md shadow-blue-600/15">
          {turn.question}
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>

        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-4 py-3 text-sm shadow-sm shadow-slate-200/60 dark:shadow-none animate-scaleIn">
          {isWaitingForFirstChunk ? (
            <TypingIndicator />
          ) : turn.error ? (
            <p className="text-red-600 dark:text-red-400">{turn.error}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:my-2 prose-strong:text-slate-900 dark:prose-strong:text-slate-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.answer}</ReactMarkdown>
            </div>
          )}

          {!turn.isStreaming && !turn.error && turn.answer && (
            <div className="mt-2 -ml-1.5 flex items-center gap-0.5">
              <button
                onClick={handleCopy}
                title="Copy"
                aria-label="Copy answer"
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleShare}
                title="Share"
                aria-label="Share answer"
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {!turn.isStreaming && groupedSources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
              {groupedSources.map((source) => (
                <span
                  key={source.documentName}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="h-3 w-3 text-blue-500" />
                  {source.documentName}
                  {source.pages.length > 0 ? (
                    <span className="text-slate-400 dark:text-slate-500">
                      · {source.pages.length > 1 ? 'pp.' : 'p.'} {source.pages.join(', ')}
                    </span>
                  ) : (
                    ''
                  )}
                </span>
              ))}
            </div>
          )}

          {!turn.isStreaming && turn.suggestedQuestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Suggested questions
              </p>
              <div className="flex flex-col gap-1.5 items-stretch">
                {turn.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onAskSuggested(q)}
                    className="group flex items-center justify-between gap-2 text-left text-xs sm:text-sm text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 border border-blue-100 dark:border-blue-500/20 hover:border-blue-200 dark:hover:border-blue-500/30 rounded-xl px-3 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <span>{q}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
