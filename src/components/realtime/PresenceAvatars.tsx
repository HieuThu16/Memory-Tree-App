"use client";

import { useRealtimeStore } from "@/lib/stores/realtimeStore";

export default function PresenceAvatars() {
  const users = useRealtimeStore((s) => s.users);

  if (users.length <= 1) return null; // Standard display only if > 1 (others are here)

  return (
    <div className="flex -space-x-2">
      {users.slice(0, 4).map((user) => (
        <div
          key={user.userId}
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-surface-2 shadow-sm"
          title={user.displayName}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[10px] font-bold text-accent">
              {user.displayName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      ))}
      {users.length > 4 && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-surface-3">
          <span className="text-[10px] font-bold text-text-muted">
            +{users.length - 4}
          </span>
        </div>
      )}
    </div>
  );
}
