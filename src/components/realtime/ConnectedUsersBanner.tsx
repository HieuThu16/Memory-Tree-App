"use client";

import Link from "next/link";
import { useRealtimeStore } from "@/lib/stores/realtimeStore";
import type { MemoryParticipant } from "@/lib/types";

export default function ConnectedUsersBanner({
  participants,
  currentUserId,
  roomId,
}: {
  participants: MemoryParticipant[];
  currentUserId: string;
  roomId: string;
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

      {/* Link to map */}
      <Link
        href="/location"
        className="flex items-center gap-1 rounded-full border border-border bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-text-muted transition hover:border-accent hover:text-accent"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 12.5 7.37 12.81a.9.9 0 0 0 1.26 0C13 22.5 20 15.4 20 10a8 8 0 0 0-8-8z" />
        </svg>
        Bản đồ
      </Link>
    </div>
  );
}
