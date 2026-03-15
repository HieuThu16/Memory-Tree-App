"use client";

import { signOut } from "@/lib/actions";
import InstallAppButton from "./InstallAppButton";

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
    <header className="relative z-50 px-2 pt-1.5 sm:px-4 sm:pt-2.5">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/60 bg-white/40 px-3 py-2 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(124,92,230,0.3)]">
        <div className="flex items-center gap-2.5">
          <h2 className="bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-sm font-bold text-transparent sm:text-base">
            Cây Kỉ Niệm
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <span className="hidden text-[11px] font-medium text-text-secondary sm:inline">
                {user.displayName}
              </span>
              <InstallAppButton />
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border border-accent/20 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-accent shadow-sm transition hover:bg-accent hover:text-white"
                title="Đăng xuất"
              >
                Đăng xuất
              </button>
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white/90 shadow-md">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-accent">
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
