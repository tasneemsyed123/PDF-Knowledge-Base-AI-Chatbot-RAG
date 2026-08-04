export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1.5">
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 typing-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
