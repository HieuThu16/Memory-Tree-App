"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import type { RoomRecord } from "@/lib/types";
import { createRoom, joinRoom } from "@/lib/actions";
import { useUiStore } from "@/lib/stores/uiStore";
import Link from "next/link";

export default function ClientFriendsSection({
  initialRooms,
}: {
  initialRooms: (RoomRecord & { member_count: number; other_members: string[] })[];
}) {
  const addToast = useUiStore((s) => s.addToast);
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"rooms" | "join" | "create">("rooms");
  const [inviteCode, setInviteCode] = useState("");
  const [roomName, setRoomName] = useState("");

  const handleCreate = () => {
    if (!roomName.trim()) return;

    startTransition(async () => {
      const result = await createRoom(roomName.trim());
      if (result.error) {
        addToast(result.error, "error");
      } else {
        addToast("Đã tạo phòng chung thành công!", "success");
        setRoomName("");
        setActiveTab("rooms");
      }
    });
  };

  const handleJoin = () => {
    if (!inviteCode.trim() || inviteCode.length < 6) return;

    startTransition(async () => {
      const result = await joinRoom(inviteCode.trim());
      if (result.error) {
        addToast(result.error, "error");
      } else {
        addToast(result.data.message, "success");
        setInviteCode("");
        setActiveTab("rooms");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
      <div className="flex gap-2 border-b border-border/50 pb-4">
        {["rooms", "join", "create"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as any)}
            className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
              activeTab === tab
                ? "bg-accent text-surface"
                : "text-text-muted hover:bg-surface-2"
            }`}
          >
            {tab === "rooms"
              ? "Khu vườn của bạn"
              : tab === "join"
                ? "Tham gia"
                : "Tạo mới"}
          </button>
        ))}
      </div>

      {activeTab === "rooms" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {initialRooms.length === 0 ? (
            <div className="col-span-full glass-card flex flex-col items-center justify-center rounded-[24px] p-10 text-center">
              <span className="text-4xl text-text-muted opacity-50">👥</span>
              <p className="mt-4 text-sm text-text-secondary">
                Bạn chưa tham gia không gian chung nào.
              </p>
            </div>
          ) : (
            initialRooms.map((room) => (
              <motion.div
                key={room.id}
                className="glass-card glass-card-hover rounded-[24px] p-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {room.name || "Khu vườn chung"}
                    </h3>
                    {room.other_members && room.other_members.length > 0 ? (
                      <p className="mt-1 text-xs text-emerald-500 font-medium">
                        Đã kết nối với: {room.other_members.join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-500/80 font-medium">
                        (Chưa có bạn bè tham gia)
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold text-text-secondary whitespace-nowrap">
                    {room.member_count} 👥
                  </span>
                </div>
                <div className="mt-6 flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                    Mã mời
                  </p>
                  <p className="font-mono text-lg font-bold tracking-[0.3em] text-accent">
                    {room.invite_code}
                  </p>
                </div>
                <Link
                  href={`/friends/${room.id}`}
                  className="btn-secondary mt-4 w-full flex items-center justify-center py-2.5 text-xs text-center"
                >
                  Vào khu vườn →
                </Link>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === "join" && (
        <motion.div
          className="glass-card max-w-sm flex flex-col gap-4 rounded-[24px] p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-text-secondary">
            Nhập mã mời gồm 6 ký tự để tham gia vào cây kỷ niệm cùng bạn bè.
          </p>
          <input
            type="text"
            placeholder="VD: ABCDEF"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="input-field text-center font-mono text-xl tracking-[0.4em] uppercase"
            maxLength={6}
          />
          <button
            type="button"
            disabled={isPending || inviteCode.length < 6}
            onClick={handleJoin}
            className="btn-primary py-3 disabled:opacity-50"
          >
            {isPending ? "Đang xử lý..." : "Tham gia ngay"}
          </button>
        </motion.div>
      )}

      {activeTab === "create" && (
        <motion.div
          className="glass-card max-w-sm flex flex-col gap-4 rounded-[24px] p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm text-text-secondary">
            Tạo một không gian riêng tư. Bạn sẽ nhận được mã mời sau khi tạo.
          </p>
          <input
            type="text"
            placeholder="Tên khu vườn. VD: Chuyến đi Hội An..."
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="input-field"
          />
          <button
            type="button"
            disabled={isPending || !roomName}
            onClick={handleCreate}
            className="btn-primary py-3 disabled:opacity-50"
          >
            {isPending ? "Đang dọn cỏ..." : "Tạo vườn mới 🌱"}
          </button>
        </motion.div>
      )}
    </div>
  );
}
