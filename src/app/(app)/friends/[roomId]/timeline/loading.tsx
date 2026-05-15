export default function LoadingTimeline() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
        <p className="text-sm font-bold text-emerald-800 drop-shadow-sm">
          Đang tải...
        </p>
      </div>
    </div>
  );
}
