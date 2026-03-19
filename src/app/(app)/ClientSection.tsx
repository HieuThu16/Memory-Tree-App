"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import MemoryGallery from "@/components/memory/MemoryGallery";
import MemoryList from "@/components/memory/MemoryList";
import MemoryTree from "@/components/tree/MemoryTree";
import type { MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";

const MemoryMap = dynamic(() => import("@/components/memory/MemoryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
      Đang tải bản đồ kỷ niệm...
    </div>
  ),
});

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
  const [viewMode, setViewMode] = useState<"tree" | "gallery" | "map" | "list">(
    "tree",
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    hydrateScope("personal", memories);
  }, [hydrateScope, memories]);

  const sortedMemories = useMemo(
    () =>
      [...scopedMemories].sort((a, b) => {
        const d1 = new Date(a.date || a.created_at).getTime();
        const d2 = new Date(b.date || b.created_at).getTime();
        return d2 - d1;
      }),
    [scopedMemories],
  );
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredMemories = useMemo(() => {
    if (!normalizedSearchQuery) {
      return sortedMemories;
    }

    return sortedMemories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(normalizedSearchQuery) ||
        (memory.category &&
          memory.category.toLowerCase().includes(normalizedSearchQuery)),
    );
  }, [normalizedSearchQuery, sortedMemories]);

  const isTreeMode = viewMode === "tree";

  const handleOpenMemory = (memory: MemoryRecord) => {
    useTreeStore.getState().setSelectedId(memory.id);
    useTreeStore.getState().setIsDetailOpen(true);
  };

  const renderActiveView = () => {
    if (viewMode === "tree") {
      return (
        <MemoryTree
          memories={filteredMemories}
          currentUserId={currentUserId ?? undefined}
          startAtLatestYear={true}
        />
      );
    }

    if (viewMode === "list") {
      return (
        <div className="mt-2">
          <MemoryList memories={filteredMemories} onSelect={handleOpenMemory} />
        </div>
      );
    }

    if (viewMode === "gallery") {
      return <MemoryGallery memories={filteredMemories} />;
    }

    return <MemoryMap memories={filteredMemories} />;
  };

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex-shrink-0 rounded-full border border-border bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
            🌸 {filteredMemories.length}/{scopedMemories.length}
          </span>

          {viewMode !== "tree" && (
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Tìm kỷ niệm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full !rounded-xl !py-1.5 !pl-7 !text-xs"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                🔍
              </span>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex flex-shrink-0 items-center gap-0.5 rounded-xl border border-border bg-white/60 p-0.5 backdrop-blur-sm">
            {(
              [
                { mode: "tree" as const, icon: "🌳", label: "Cây" },
                { mode: "list" as const, icon: "📋", label: "Danh sách" },
                { mode: "gallery" as const, icon: "🖼️", label: "Thư viện" },
                { mode: "map" as const, icon: "🗺️", label: "Bản đồ" },
              ] as const
            ).map(({ mode, icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  viewMode === mode
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:bg-white"
                }`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreate()}
            className="btn-primary flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] whitespace-nowrap"
          >
            + Thêm
          </button>
        </div>
      </div>

      <div
        className={`relative ${
          isTreeMode
            ? "mt-1"
            : "mt-2 min-h-[50vh] rounded-2xl bg-white/58 p-1.5 sm:p-3"
        }`}
      >
        {renderActiveView()}
      </div>
    </section>
  );
}
