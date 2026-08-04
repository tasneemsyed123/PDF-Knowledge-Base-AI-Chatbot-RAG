'use client';

import { useEffect, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Ask a question about the uploaded documents…',
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasDisabled = useRef(disabled);

  useEffect(() => {
    if (value === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value]);

  // A streaming reply disables the textarea (a disabled input can't hold
  // focus), so once it re-enables the browser doesn't restore focus on its
  // own - without this, every reply forces a manual re-click to keep
  // typing. Only fires on the true -> false transition, not on mount, so
  // switching into an existing chat doesn't yank focus/pop a mobile keyboard.
  useEffect(() => {
    if (wasDisabled.current && !disabled) {
      textareaRef.current?.focus();
    }
    wasDisabled.current = disabled;
  }, [disabled]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={cn(
          // dark: and focus-within: are both single-variant classes of equal
          // specificity - which one wins when both are active comes down to
          // Tailwind's stylesheet emission order, not which was written last
          // here, and .dark was winning: the glow ring was permanently stuck
          // at its resting gray in dark mode regardless of focus. The
          // dark:focus-within: pair is a compound selector, strictly more
          // specific, so it reliably wins over plain .dark once focused.
          'relative rounded-[1.75rem] p-[1.5px] bg-gradient-to-r from-slate-200 via-slate-200 to-slate-200 dark:from-slate-700 dark:via-slate-700 dark:to-slate-700 transition-all duration-300 focus-within:from-blue-400 focus-within:via-indigo-400 focus-within:to-blue-500 focus-within:shadow-[0_0_0_5px_rgba(59,130,246,0.1)] dark:focus-within:from-blue-400 dark:focus-within:via-indigo-400 dark:focus-within:to-blue-500 dark:focus-within:shadow-[0_0_0_5px_rgba(96,165,250,0.25)]',
          disabled && 'opacity-70',
        )}
      >
        <div className="flex items-end gap-2 rounded-[calc(1.75rem-1.5px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-2.5 shadow-[0_10px_35px_-12px_rgba(30,64,175,0.25)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            autoFocus={autoFocus}
            className="flex-1 resize-none bg-transparent border-none px-1.5 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:cursor-not-allowed max-h-40"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send question"
            className="shrink-0 h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:hover:translate-y-0 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
