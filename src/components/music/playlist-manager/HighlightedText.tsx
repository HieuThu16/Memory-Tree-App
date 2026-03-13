function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const normalized = query.trim();
  if (!normalized) {
    return <span className={className}>{text}</span>;
  }

  const matcher = new RegExp(`(${escapeRegExp(normalized)})`, "ig");
  const parts = text.split(matcher);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === normalized.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded bg-yellow-200 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}
