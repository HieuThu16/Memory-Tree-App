"use client";

import { signOut } from "@/lib/actions";
import { motion } from "framer-motion";

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
    <motion.header
      className="flex items-center justify-between px-6 pt-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
          🌳
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Memory Tree</h2>
          <p className="text-[11px] text-text-muted">
            {user ? user.displayName : "Guest"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-text-muted transition hover:border-border-strong hover:text-foreground"
            >
              Đăng xuất
            </button>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[11px] font-bold text-accent">
                  {initials}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.header>
  );
}
