"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type RoomListItem = {
  id: string;
  name: string | null;
  plansCount: number;
};

export default function PlansRoomList({ rooms }: { rooms: RoomListItem[] }) {
  const router = useRouter();
  const [openingRoomId, setOpeningRoomId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenRoom = (roomId: string) => {
    setOpeningRoomId(roomId);
    startTransition(() => {
      router.push(`/plans/${roomId}`);
    });
  };

  return (
    <div className="grid gap-2">
      {rooms.map((room) => {
        const isOpening = isPending && openingRoomId === room.id;

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => handleOpenRoom(room.id)}
            disabled={isPending}
            className="glass-card flex items-center justify-between rounded-2xl p-4 text-left transition hover:translate-y-[-1px] disabled:opacity-70"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground whitespace-normal break-words">
                {room.name || "Phòng chung"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {room.plansCount} dự định
              </p>
            </div>
            <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-text-secondary">
              {isOpening ? "Đang mở room..." : "Mở"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
