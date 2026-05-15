export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass-card flex flex-col items-center gap-3 rounded-3xl px-6 py-5">
        <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-accent/25 border-t-accent" />
        <p className="text-xs font-medium text-text-secondary">
          Dang tai du lieu...
        </p>
      </div>
    </div>
  );
}
