export default function PlansRoomLoading() {
  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground">
            Đang mở room...
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Đang tải dự định và thành viên phòng.
          </p>
          <div className="mt-4 h-2 w-44 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </section>
    </main>
  );
}
