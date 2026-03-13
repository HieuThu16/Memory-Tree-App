const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  itunes: { label: "iTunes", color: "bg-sky-100 text-sky-700" },
  deezer: { label: "Deezer", color: "bg-purple-100 text-purple-700" },
  jamendo: { label: "Jamendo", color: "bg-green-100 text-green-700" },
};

export default function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_LABELS[source] ?? {
    label: source,
    color: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}
