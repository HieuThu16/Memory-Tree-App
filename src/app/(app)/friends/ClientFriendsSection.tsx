"use client";

import { useState, useTransition } from "react";
import type { RoomSummary } from "@/lib/types";
import { createRoom, joinRoom, deleteRoom, updateRoom } from "@/lib/actions";
import { useUiStore } from "@/lib/stores/uiStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ClientFriendsSection({
  initialRooms,
}: {
  initialRooms: RoomSummary[];
}) {
  const addToast = useUiStore((s) => s.addToast);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [rooms, setRooms] = useState(initialRooms);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [sharedPlaylistUrl, setSharedPlaylistUrl] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const upsertRoom = (nextRoom: RoomSummary) => {
    setRooms((current) => {
      const existingIndex = current.findIndex(
        (room) => room.id === nextRoom.id,
      );

      if (existingIndex === -1) {
        return [nextRoom, ...current];
      }

      return current.map((room) =>
        room.id === nextRoom.id ? { ...room, ...nextRoom } : room,
      );
    });
  };

  const handleCreate = () => {
    if (!roomName.trim()) return;

    startTransition(async () => {
      const result = await createRoom({
        name: roomName.trim(),
        sharedPlaylistUrl,
      });
      if (result.error) {
        addToast(result.error, "error");
      } else if (!result.data?.room) {
        addToast("Lỗi tạo vườn", "error");
      } else {
        upsertRoom(result.data.room);
        addToast("Tạo vườn thành công! 🌱", "success");
        setRoomName("");
        setSharedPlaylistUrl("");
        setShowCreate(false);
        router.refresh();
        router.push(`/friends/${result.data.room.id}`);
      }
    });
  };

  const handleJoin = () => {
    if (!inviteCode.trim() || inviteCode.length < 6) return;

    startTransition(async () => {
      const result = await joinRoom(inviteCode.trim());
      if (result.error) {
        addToast(result.error, "error");
      } else if (!result.data) {
        addToast("Lỗi tham gia", "error");
      } else {
        if (result.data.room) {
          upsertRoom(result.data.room);
        }
        addToast(result.data.message, "success");
        setInviteCode("");
        setShowJoin(false);
        router.refresh();
        router.push(`/friends/${result.data.room_id}`);
      }
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!confirm("Xóa khu vườn này? Toàn bộ kỉ niệm chung sẽ mất.")) return;

    startTransition(async () => {
      const result = await deleteRoom(roomId);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        setRooms((current) => current.filter((room) => room.id !== roomId));
        addToast("Đã xóa vườn 🍂", "success");
        router.refresh();
      }
    });
  };

  const handleSaveRoomName = (roomId: string) => {
    if (!editingName.trim()) return;

    startTransition(async () => {
      const currentRoom = rooms.find((room) => room.id === roomId);
      const result = await updateRoom(roomId, {
        name: editingName.trim(),
        sharedPlaylistUrl: currentRoom?.shared_playlist_url ?? null,
      });

      if (result.error) {
        addToast(result.error, "error");
      } else {
        setRooms((current) =>
          current.map((room) =>
            room.id === roomId
              ? {
                  ...room,
                  name: result.data?.name ?? editingName.trim(),
                  shared_playlist_url:
                    result.data?.shared_playlist_url ??
                    room.shared_playlist_url,
                }
              : room,
          ),
        );
        addToast("Đã đổi tên 🌿", "success");
        setEditingRoomId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          🌿 Khu vườn chung
        </h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setShowJoin(!showJoin);
              setShowCreate(false);
            }}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
              showJoin
                ? "border-accent bg-accent text-white"
                : "border-border bg-white/75 text-text-secondary hover:border-accent"
            }`}
          >
            🔗 Mã mời
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(!showCreate);
              setShowJoin(false);
            }}
            className="btn-primary rounded-full px-3 py-1.5 text-[10px]"
          >
            + Tạo 🌱
          </button>
        </div>
      </div>

      {/* Join form */}
      {showJoin && (
        <div className="glass-card flex items-center gap-2 rounded-xl p-3">
          <input
            type="text"
            placeholder="ABCDEF"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="input-field flex-1 text-center font-mono text-base tracking-[0.3em] uppercase !rounded-lg !py-2"
            maxLength={6}
          />
          <button
            type="button"
            disabled={isPending || inviteCode.length < 6}
            onClick={handleJoin}
            className="btn-primary whitespace-nowrap px-4 py-2 text-xs disabled:opacity-50"
          >
            {isPending ? "..." : "Vào 🌸"}
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="glass-card rounded-xl p-3">
          <div className="grid gap-2">
            <input
              type="text"
              placeholder="Tên vườn mới..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="input-field !rounded-lg !py-2 !text-sm"
            />
            <input
              type="url"
              placeholder="Link playlist Spotify (tuỳ chọn)"
              value={sharedPlaylistUrl}
              onChange={(e) => setSharedPlaylistUrl(e.target.value)}
              className="input-field !rounded-lg !py-2 !text-sm"
            />
          </div>
          <button
            type="button"
            disabled={isPending || !roomName}
            onClick={handleCreate}
            className="btn-primary mt-3 w-full whitespace-nowrap px-4 py-2 text-xs disabled:opacity-50"
          >
            {isPending ? "..." : "Tạo 🌱"}
          </button>
        </div>
      )}

      {/* Room list */}
      {rooms.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl p-8 text-center">
          <span className="text-3xl">🌼</span>
          <p className="mt-3 text-sm text-text-secondary">
            Chưa có vườn chung nào
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="glass-card glass-card-hover rounded-xl p-3 sm:p-4"
            >
              {/* Room name - editable */}
              <div className="flex items-start justify-between gap-2">
                {editingRoomId === room.id ? (
                  <div className="flex flex-1 items-center gap-1.5">
                    <input
                      type="text"
                      aria-label="Đổi tên khu vườn"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="input-field flex-1 !rounded-lg !py-1.5 !text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRoomName(room.id);
                        if (e.key === "Escape") setEditingRoomId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRoomName(room.id)}
                      disabled={isPending}
                      className="rounded-lg bg-accent px-2 py-1.5 text-[10px] text-white"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoomId(null)}
                      className="rounded-lg border border-border px-2 py-1.5 text-[10px] text-text-muted"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                      {room.name || "Khu vườn chung"}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                      {room.is_shared && room.other_members.length > 0 && (
                        <span className="text-green">
                          🌸 {room.other_members.join(", ")}
                        </span>
                      )}
                      {!room.is_shared && <span>🌼 Chờ mời</span>}
                      <span className="opacity-50">•</span>
                      <span>{room.member_count} 👥</span>
                    </div>
                  </div>
                )}

                {editingRoomId !== room.id && (
                  <div className="flex items-center gap-0.5">
                    {/* Edit name */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoomId(room.id);
                        setEditingName(room.name || "");
                      }}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-white/80 hover:text-accent"
                      title="Đổi tên"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {/* Delete / Leave */}
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room.id)}
                      disabled={isPending}
                      className="rounded-lg p-1.5 text-text-muted transition hover:bg-white/80 hover:text-rose disabled:opacity-50"
                      title="Xóa vườn"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Invite code */}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-white/70 px-2.5 py-1.5">
                <span className="font-mono text-xs font-bold tracking-[0.25em] text-accent">
                  {room.invite_code ?? "------"}
                </span>
                <button
                  type="button"
                  disabled={!room.invite_code}
                  onClick={() => {
                    if (!room.invite_code) {
                      addToast("Room này chưa có mã mời hoạt động.", "error");
                      return;
                    }

                    navigator.clipboard.writeText(room.invite_code);
                    addToast("Đã copy mã mời 📋", "success");
                  }}
                  className="text-[9px] font-medium text-text-muted hover:text-accent"
                >
                  📋
                </button>
              </div>

              {room.shared_playlist_url ? (
                <p className="mt-2 text-[10px] font-medium text-text-secondary">
                  🎵 Có playlist chung
                </p>
              ) : null}

              {/* Enter button */}
              <Link
                href={`/friends/${room.id}`}
                prefetch={true}
                className="btn-secondary mt-2 flex w-full items-center justify-center py-2 text-[10px]"
              >
                Vào vườn →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
