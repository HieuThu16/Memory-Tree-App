export default function PlaybackModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-white text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}
