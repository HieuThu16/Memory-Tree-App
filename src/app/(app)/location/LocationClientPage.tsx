"use client";

export default function LocationClientPage({
  user,
}: {
  user: { id: string; displayName: string; avatarUrl: string | null };
}) {
  return (
    <main className="flex h-[100dvh] flex-col pb-16 px-4 pt-6 max-w-lg mx-auto w-full relative">
      <div className="flex flex-1 flex-col gap-6 justify-center">
        <div className="glass-card rounded-3xl p-8 shadow-[var(--shadow-card)] text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-4xl">
            📱
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
            Mobile Only
          </p>
          <h1 className="mt-3 text-2xl font-medium text-foreground">
            Chia sẻ vị trí đã chuyển sang app mobile
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            Xin chào {user.displayName}. Từ bây giờ, GPS nền và lịch trình di
            chuyển chỉ chạy trên app Capacitor để đảm bảo tracking thật khi app
            bị đưa xuống nền hoặc điện thoại tắt màn hình.
          </p>

          <div className="mt-6 rounded-2xl border border-white/60 bg-white/65 p-4 text-left">
            <h2 className="text-sm font-semibold text-foreground">
              Web đã tắt chức năng location
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>Web không còn bật GPS, ghi history hay realtime location.</li>
              <li>
                Timeline và background tracking sẽ do app mobile đảm nhiệm.
              </li>
              <li>Repo đã có sẵn thư mục `mobile/` để tiếp tục build app.</li>
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-accent/5 p-4 text-left">
            <h2 className="text-sm font-semibold text-foreground">
              Bắt đầu app mobile
            </h2>
            <div className="mt-3 space-y-2 text-sm text-text-secondary font-mono">
              <p>npm run mobile:install</p>
              <p>npm run mobile:build</p>
              <p>npm run mobile:sync</p>
            </div>
          </div>

          <div className="mt-8">
            <a
              href="memorytree://auth/callback"
              className="flex w-full items-center justify-center rounded-2xl bg-accent py-4 text-sm font-bold text-white shadow-lg transition-transform active:scale-95"
            >
              Mở App MAP (Deep Link)
            </a>
            <p className="mt-3 text-xs text-text-secondary">
              Nếu login thành công nhưng vẫn ở trang này, bấm nút trên để quay lại app.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
