"use client";

import { signOut } from "@/lib/actions";

type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export default function AppHeader({ user }: { user: UserInfo | null }) {
  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "MT";

  return (
    <header className="px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl bg-[linear-gradient(135deg,var(--accent)_0%,var(--accent-soft)_100%)] px-3 py-2 text-white shadow-[0_16px_36px_-20px_rgba(108,76,215,0.7)]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            🌸
          </div>
          <h2 className="text-sm font-semibold text-white sm:text-base">
            Cây Kỉ Niệm
          </h2>
          <span className="text-xs opacity-70">🌿</span>
        </div>

        <div className="flex items-center gap-1.5">
          {user && (
            <>
              <span className="hidden text-[10px] text-white/70 sm:inline">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-white/20 bg-white/14 p-1.5 text-white transition hover:bg-white/22"
                title="Đăng xuất"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/90 shadow-sm">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-accent">
                    {initials}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
