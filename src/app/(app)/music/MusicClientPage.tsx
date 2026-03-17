"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlaylistRecord, RoomSummary } from "@/lib/types";
import RoomPlaylistManager from "@/components/music/RoomPlaylistManager";

export default function MusicClientPage({
  user,
  rooms,
  activeRoomId,
  initialPlaylists,
}: {
  user: { id: string; displayName: string; avatarUrl: string | null };
  rooms: RoomSummary[];
  activeRoomId: string | null;
  initialPlaylists: PlaylistRecord[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    activeRoomId,
  );

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    startTransition(() => {
      router.push(`/music?room=${roomId}`);
    });
  };

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">
              🎵 Nhạc chung
            </h1>
            <span className="rounded-full border border-border bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              {initialPlaylists.length} playlist
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            Xin chào, {user.displayName}
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="glass-card rounded-[28px] p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
              🎵
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Chưa có khu vườn
            </p>
            <h2 className="mt-3 text-xl font-medium text-foreground">
              Tạo hoặc tham gia khu vườn trước
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Playlist nhạc được gắn theo từng khu vườn chung. Hãy tạo hoặc nhận
              lời mời vào khu vườn với bạn bè để bắt đầu nghe nhạc cùng nhau.
            </p>
            <Link
              href="/friends"
              className="btn-primary mt-5 inline-block px-6 py-3 text-sm"
            >
              Đến trang Bạn bè →
            </Link>
          </div>
        ) : (
          <>
            {rooms.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleRoomChange(room.id)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${
                      room.id === selectedRoomId
                        ? "border-accent bg-accent text-white shadow-[0_6px_16px_-8px_rgba(108,76,215,0.6)]"
                        : "border-border bg-white/80 text-foreground hover:border-accent/60"
                    }`}
                  >
                    🌿 {room.name || "Khu vườn"}
                    <span className="ml-1.5 text-[11px] opacity-70">
                      {room.member_count} thành viên
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-white/80 px-4 py-2.5">
                <span className="text-sm font-medium text-foreground">
                  🌿 {selectedRoom?.name || "Khu vườn"}
                </span>
                <span className="text-[11px] text-text-muted">
                  · {selectedRoom?.member_count ?? 0} thành viên
                  {selectedRoom?.other_members?.[0]
                    ? ` · cùng ${selectedRoom.other_members[0]}`
                    : ""}
                </span>
              </div>
            )}

            {selectedRoomId ? (
              <RoomPlaylistManager
                key={selectedRoomId}
                roomId={selectedRoomId}
                initialPlaylists={initialPlaylists}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
