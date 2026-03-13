"use client";

import { useRealtimeStore } from "@/lib/stores/realtimeStore";
import type { MemoryParticipant } from "@/lib/types";

export default function ConnectedUsersBanner({
  participants,
  currentUserId,
}: {
  participants: MemoryParticipant[];
  currentUserId: string;
}) {
  const onlineUsers = useRealtimeStore((s) => s.users);

  const onlineUserIds = new Set(onlineUsers.map((u) => u.userId));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {participants.map((p) => {
        const isOnline = onlineUserIds.has(p.userId);
        const isMe = p.userId === currentUserId;

        return (
          <div
            key={p.userId}
            className="flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-2.5 py-1 backdrop-blur-sm"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white shadow-sm">
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-accent">
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Online dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  isOnline ? "bg-green animate-pulse" : "bg-gray-300"
                }`}
              />
            </div>

            <span className="max-w-[80px] truncate text-[10px] font-semibold text-text-secondary">
              {isMe ? "Bạn" : p.displayName}
            </span>

            {isOnline && (
              <span className="text-[9px] text-green font-medium">●</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
