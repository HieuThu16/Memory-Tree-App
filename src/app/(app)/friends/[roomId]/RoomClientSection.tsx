"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryGallery from "@/components/memory/MemoryGallery";
import MemoryList from "@/components/memory/MemoryList";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import ConnectedUsersBanner from "@/components/realtime/ConnectedUsersBanner";

const MemoryMap = dynamic(() => import("@/components/memory/MemoryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[50vh] text-text-muted animate-pulse">
      Đang tải bản đồ kỷ niệm...
    </div>
  ),
});

export default function RoomClientSection({
  memories,
  roomId,
  participants,
  currentUserId,
}: {
  memories: MemoryRecord[];
  roomId: string;
  participants: MemoryParticipant[];
  currentUserId: string;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);
  const hydrateScope = useMemoryStore((s) => s.hydrateScope);
  const scopedMemories = useMemoryStore((s) =>
    s.scopeKey === `room:${roomId}` ? s.memories : memories,
  );
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
  const friendParticipant = useMemo(
    () =>
      participants.find(
        (participant) => participant.userId !== currentUserId,
      ) ?? null,
    [currentUserId, participants],
  );
  const [isSwitchingView, startSwitchViewTransition] = useTransition();
  const [memoryViewMode, setMemoryViewMode] = useState<
    "tree" | "gallery" | "map" | "list"
  >("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const handleSwitchViewMode = (
    nextMode: "tree" | "gallery" | "map" | "list",
  ) => {
    if (nextMode === memoryViewMode) return;
    startSwitchViewTransition(() => {
      setMemoryViewMode(nextMode);
    });
  };

  useEffect(() => {
    hydrateScope(`room:${roomId}`, memories);
  }, [hydrateScope, memories, roomId]);

  const filteredMemories = useMemo(() => {
    let result = scopedMemories;
    if (deferredSearchQuery.trim()) {
      const lowerQ = deferredSearchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(lowerQ) ||
          (m.category && m.category.toLowerCase().includes(lowerQ)),
      );
    }
    // Sort from newest to oldest
    const sorted = [...result].sort((a, b) => {
      const d1 = new Date(a.date || a.created_at).getTime();
      const d2 = new Date(b.date || b.created_at).getTime();
      return d2 - d1;
    });
    return sorted;
  }, [deferredSearchQuery, scopedMemories]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const startedAt = performance.now();
    let result = scopedMemories;
    if (deferredSearchQuery.trim()) {
      const lowerQ = deferredSearchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(lowerQ) ||
          (m.category && m.category.toLowerCase().includes(lowerQ)),
      );
    }

    const sorted = [...result].sort((a, b) => {
      const d1 = new Date(a.date || a.created_at).getTime();
      const d2 = new Date(b.date || b.created_at).getTime();
      return d2 - d1;
    });

    console.log(
      `[Perf][RoomClientSection] filter+sort=${(performance.now() - startedAt).toFixed(2)}ms (query='${deferredSearchQuery}', total=${scopedMemories.length}, visible=${sorted.length})`,
    );
  }, [deferredSearchQuery, scopedMemories]);

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Top Header Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(108,76,215,0.9)]">
              👥 {participants.length}/2
            </span>
            <span className="rounded-full border border-border bg-white/75 px-3 py-1.5 text-[10px] font-semibold text-text-secondary">
              🌸 {filteredMemories.length} / {scopedMemories.length}
            </span>
            {friendParticipant ? (
              <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-text-secondary">
                <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-white shadow-sm">
                  {friendParticipant.avatarUrl ? (
                    <img
                      src={friendParticipant.avatarUrl}
                      alt={friendParticipant.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      {friendParticipant.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="max-w-[110px] truncate">
                  {friendParticipant.displayName}
                </span>
              </div>
            ) : (
              <span className="rounded-full border border-dashed border-border bg-white/65 px-3 py-1.5 text-[10px] font-semibold text-text-muted">
                Chờ thêm 1 người bạn
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => openCreate(roomId)}
            className="btn-primary rounded-full px-3 py-2 text-[10px]"
          >
            + Góp 🌱
          </button>
        </div>

        {/* Connected users presence banner */}
        <ConnectedUsersBanner
          participants={participants}
          currentUserId={currentUserId}
        />

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
              onClick={() => handleSwitchViewMode("tree")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                memoryViewMode === "tree"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Cây kỉ niệm"
            >
              🌳
            </button>
            <button
              onClick={() => handleSwitchViewMode("list")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                memoryViewMode === "list"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Danh sách"
            >
              📋
            </button>
            <button
              onClick={() => handleSwitchViewMode("gallery")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                memoryViewMode === "gallery"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Thư viện ảnh"
            >
              🖼️
            </button>
            <button
              onClick={() => handleSwitchViewMode("map")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                memoryViewMode === "map"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Bản đồ kỷ niệm"
            >
              🗺️
            </button>
          </div>
        </div>
      </div>

      {/* Content View */}
      <div className="mt-3 rounded-2xl bg-white/58 p-1.5 sm:p-3 min-h-[50vh] relative">
        {isSwitchingView ? (
          <div className="absolute right-3 top-3 rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] text-text-muted">
            Đang chuyển tab...
          </div>
        ) : null}
        <MemoryTree
          memories={filteredMemories}
          participants={participants}
          participantsByUserId={participantsByUserId}
          isTwoPerson={isTwoPerson}
          currentUserId={currentUserId}
          hideTree={memoryViewMode !== "tree"}
        />
        {memoryViewMode === "list" && (
          <div className="mt-2">
            <MemoryList
              memories={filteredMemories}
              participantsByUserId={participantsByUserId}
              onSelect={(m) => {
                useTreeStore.getState().setSelectedId(m.id);
                useTreeStore.getState().setIsDetailOpen(true);
              }}
            />
          </div>
        )}
        {memoryViewMode === "gallery" && (
          <MemoryGallery
            memories={filteredMemories}
            participantsByUserId={participantsByUserId}
          />
        )}
        {memoryViewMode === "map" && (
          <MemoryMap
            memories={filteredMemories}
            participantsByUserId={participantsByUserId}
          />
        )}
      </div>
    </section>
  );
}
