export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md rounded-3xl border border-amber-900/10 bg-white/70 p-8 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-900/60">Offline</p>
        <h1 className="mt-3 text-3xl text-amber-950">Khong co ket noi</h1>
        <p className="mt-3 text-sm text-amber-900/70">
          Memory Tree se tu dong tai lai khi co mang. Du lieu da luu tren thiet bi
          van san sang.
        </p>
      </div>
    </main>
  );
}
