export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[58vh] w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
      <div className="glass-card rounded-[32px] p-5 sm:p-6">
        <div className="animate-shimmer h-3 w-24 rounded-full" />
        <div className="mt-4 animate-shimmer h-8 w-48 rounded-full" />
        <div className="mt-3 animate-shimmer h-4 w-72 rounded-full max-w-full" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-card rounded-[32px] p-5">
          <div className="animate-shimmer h-4 w-28 rounded-full" />
          <div className="mt-4 animate-shimmer h-28 rounded-[28px]" />
          <div className="mt-3 animate-shimmer h-12 rounded-2xl" />
          <div className="mt-2 animate-shimmer h-12 rounded-2xl" />
        </div>

        <div className="glass-card rounded-[32px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="animate-shimmer h-7 w-36 rounded-full" />
            <div className="animate-shimmer h-10 w-28 rounded-full" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-border bg-white/70 p-3"
              >
                <div className="animate-shimmer h-32 rounded-[18px]" />
                <div className="mt-3 animate-shimmer h-4 w-3/4 rounded-full" />
                <div className="mt-2 animate-shimmer h-3 w-1/2 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
