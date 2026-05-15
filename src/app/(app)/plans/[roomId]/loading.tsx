export default function PlansRoomLoading() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 pb-24 pt-3 sm:px-6 sm:pt-4">
      <div className="glass-card flex flex-col items-center gap-3 rounded-3xl px-6 py-5">
        <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-emerald-300/40 border-t-emerald-500" />
        <p className="text-xs font-medium text-text-secondary">
          Dang tai du lieu du dinh...
        </p>
      </div>
    </main>
  );
}
