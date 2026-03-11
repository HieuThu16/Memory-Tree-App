"use client";

import { useMemo, useState } from "react";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryGallery from "@/components/memory/MemoryGallery";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function RoomClientSection({
  memories,
  roomId,
  participants,
}: {
  memories: MemoryRecord[];
  roomId: string;
  participants: MemoryParticipant[];
}) {
  const openCreate = useTreeStore((s) => s.openCreate);
  const participantsByUserId = useMemo(
    () =>
      new Map(
        participants.map(
          (participant) => [participant.userId, participant] as const,
        ),
      ),
    [participants],
  );

  const isTwoPerson = participants.length === 2;
  const [viewMode, setViewMode] = useState<"tree" | "gallery">("tree");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    const lowerQ = searchQuery.toLowerCase();
    return memories.filter(
      (m) =>
        m.title.toLowerCase().includes(lowerQ) ||
        (m.category && m.category.toLowerCase().includes(lowerQ))
    );
  }, [memories, searchQuery]);

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(108,76,215,0.9)]">
              👥 {participants.length}
            </span>
            <span className="rounded-full border border-border bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-text-secondary">
              🌸 {filteredMemories.length} / {memories.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => openCreate(roomId)}
            className="btn-primary rounded-full px-3 py-2 text-[10px]"
          >
            + Góp 🌱
          </button>
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kỉ niệm chung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full !rounded-xl !py-2 !pl-8 !text-xs"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
              🔍
            </span>
          </div>
          <div className="flex items-center rounded-xl border border-border bg-white/60 p-1 backdrop-blur-sm">
            <button
              onClick={() => setViewMode("tree")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "tree"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Cây kỉ niệm"
            >
              🌳
            </button>
            <button
              onClick={() => setViewMode("gallery")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "gallery"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Thư viện ảnh"
            >
              🖼️
            </button>
          </div>
        </div>
      </div>

      {/* Content View */}
      <div className="mt-3 rounded-2xl bg-white/58 p-1.5 sm:p-2 min-h-[50vh]">
        <div className={viewMode === "tree" ? "" : "hidden"}>
          <MemoryTree
            memories={filteredMemories}
            participants={participants}
            participantsByUserId={participantsByUserId}
            isTwoPerson={isTwoPerson}
          />
        </div>
        {viewMode === "gallery" && (
          <MemoryGallery
            memories={filteredMemories}
            participantsByUserId={participantsByUserId}
          />
        )}
      </div>
    </section>
  );
}
