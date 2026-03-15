"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import NatureParticles from "@/components/ui/NatureParticles";

const MemoryTree = dynamic(() => import("@/components/tree/MemoryTree"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[50vh] text-text-muted animate-pulse">
      Đang tải cây kỉ niệm...
    </div>
  ),
});

const MemoryMap = dynamic(() => import("@/components/memory/MemoryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[50vh] text-text-muted animate-pulse">
      Đang tải bản đồ kỷ niệm...
    </div>
  ),
});

import MemoryGallery from "@/components/memory/MemoryGallery";
import MemoryList from "@/components/memory/MemoryList";
import type { MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function ClientSection({
  memories,
  currentUserId,
}: {
  memories: MemoryRecord[];
  currentUserId: string | null;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);
  const hydrateScope = useMemoryStore((s) => s.hydrateScope);
  const scopedMemories = useMemoryStore((s) =>
    s.scopeKey === "personal" ? s.memories : memories,
  );
  const [isSwitchingView, startSwitchViewTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"tree" | "gallery" | "map" | "list">(
    "tree",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const handleSwitchViewMode = (
    nextMode: "tree" | "gallery" | "map" | "list",
  ) => {
    if (nextMode === viewMode) return;
    startSwitchViewTransition(() => {
      setViewMode(nextMode);
    });
  };

  useEffect(() => {
    hydrateScope("personal", memories);
  }, [hydrateScope, memories]);

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
      `[Perf][ClientSection] filter+sort=${(performance.now() - startedAt).toFixed(2)}ms (query='${deferredSearchQuery}', total=${scopedMemories.length}, visible=${sorted.length})`,
    );
  }, [deferredSearchQuery, scopedMemories]);

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <NatureParticles />
      <div className="flex flex-col gap-3 relative z-10">
        {/* Top Controls: Stats & Add */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(108,76,215,0.9)]">
            🌸 {filteredMemories.length} / {scopedMemories.length}
          </span>
          <button
            type="button"
            onClick={() => openCreate()}
            className="btn-primary rounded-full px-3 py-2 text-[10px]"
          >
            + Thêm 🌱
          </button>
        </div>

        {/* Search & View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kỉ niệm (Vd: Du lịch)..."
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
                viewMode === "tree"
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
                viewMode === "list"
                  ? "bg-accent text-white shadow-sm"
                  : "text-text-secondary hover:bg-white"
              }`}
              title="Danh sách kỉ niệm"
            >
              📋
            </button>
            <button
              onClick={() => handleSwitchViewMode("gallery")}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                viewMode === "gallery"
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
                viewMode === "map"
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
          currentUserId={currentUserId ?? undefined}
          hideTree={viewMode !== "tree"}
        />
        {viewMode === "list" && (
          <div className="mt-2">
            <MemoryList
              memories={filteredMemories}
              onSelect={(m) => {
                useTreeStore.getState().setSelectedId(m.id);
                useTreeStore.getState().setIsDetailOpen(true);
              }}
            />
          </div>
        )}
        {viewMode === "gallery" && (
          <MemoryGallery memories={filteredMemories} />
        )}
        {viewMode === "map" && <MemoryMap memories={filteredMemories} />}
      </div>
    </section>
  );
}
