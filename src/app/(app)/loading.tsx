export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-12 text-center text-text-muted">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
      <p className="text-sm font-medium">Đang tải khu vườn...</p>
    </div>
  );
}
