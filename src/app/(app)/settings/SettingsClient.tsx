"use client";

import { signOut } from "@/lib/actions";

type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export default function SettingsClient({ user }: { user: UserInfo }) {
  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "MT";

  return (
    <div className="flex flex-col gap-4">
      {/* Profile Section */}
      <div className="glass-card flex items-center gap-4 rounded-2xl p-4 sm:p-6">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white/90 shadow-lg">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xl font-bold text-accent">
              {initials}
            </span>
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-lg font-bold text-foreground">
            {user.displayName}
          </span>
          <span className="truncate text-sm text-text-muted">
            {user.email}
          </span>
        </div>
      </div>

      {/* Account Actions */}
      <div className="glass-card flex flex-col gap-2 rounded-2xl p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Tài khoản
        </h2>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
          >
            <span>Đăng xuất khỏi ứng dụng</span>
            <span className="text-lg">🚪</span>
          </button>
        </div>
      </div>
    </div>
  );
}
