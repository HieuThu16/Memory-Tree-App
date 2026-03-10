"use client";

import { motion } from "framer-motion";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryList from "@/components/memory/MemoryList";
import type { MemoryRecord } from "@/lib/types";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function RoomClientSection({
  memories,
  roomId,
}: {
  memories: MemoryRecord[];
  roomId: string;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);

  return (
    <>
      <div
        className="glass-card overflow-hidden rounded-[32px] p-6 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center justify-between pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
            Cây kỷ niệm nhóm
          </p>
          <button
            type="button"
            onClick={() => openCreate(roomId)}
            className="btn-primary rounded-full px-4 py-2 text-[11px]"
          >
            + Góp kỷ niệm
          </button>
        </div>
        <div className="rounded-2xl bg-black/20 p-2 inset-shadow-sm">
          <MemoryTree memories={memories} />
        </div>
      </div>

      <div
        className="flex flex-col gap-6 pt-6 animate-fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">
            Thư viện chung
          </p>
        </div>
        <MemoryList
          memories={memories}
          onSelect={(m) => {
            useTreeStore.getState().setSelectedId(m.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </>
  );
}
