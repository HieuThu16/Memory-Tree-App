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
import MemoryGallery from "@/components/memory/MemoryGallery";
import MemoryList from "@/components/memory/MemoryList";
import type { MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";

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
    const sorted = [...result].sort((a, b) => {
      const d1 = new Date(a.date || a.created_at).getTime();
      const d2 = new Date(b.date || b.created_at).getTime();
      return d2 - d1;
    });
    return sorted;
  }, [deferredSearchQuery, scopedMemories]);

  const isTreeMode = viewMode === "tree";

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <NatureParticles />
      {/* Top toolbar ONLY when NOT in tree mode */}
      {!isTreeMode && (
        <div className="flex flex-col gap-2 relative z-10">
          {/* Single compact toolbar — all controls on one row */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Stats badge */}
            <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              🌸 {filteredMemories.length}/{scopedMemories.length}
            </span>

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="Tìm kỉ niệm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full !rounded-xl !py-1.5 !pl-7 !text-xs"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                🔍
              </span>
            </div>

            <div className="flex-1" />

            {/* View mode icon buttons */}
            <div className="flex-shrink-0 flex items-center rounded-xl border border-border bg-white/60 p-0.5 backdrop-blur-sm gap-0.5">
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
                  onClick={() => handleSwitchViewMode(mode)}
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

            {/* Add button */}
            <button
              type="button"
              onClick={() => openCreate()}
              className="flex-shrink-0 btn-primary rounded-full px-3 py-1.5 text-[10px] whitespace-nowrap"
            >
              + Thêm
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`relative ${
          isTreeMode
            ? "mt-1"
            : "mt-2 rounded-2xl bg-white/58 p-1.5 sm:p-3 min-h-[50vh]"
        }`}
      >
        {isSwitchingView ? (
          <div className="absolute right-3 top-3 z-10 rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] text-text-muted">
            Đang chuyển tab...
          </div>
        ) : null}

        <MemoryTree
          memories={filteredMemories}
          currentUserId={currentUserId ?? undefined}
          hideTree={viewMode !== "tree"}
          bottomBar={
            viewMode === "tree" ? (
              <div className="flex w-full items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex-shrink-0 rounded-full border border-emerald-500/20 bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 backdrop-blur-sm shadow-sm">
                    🌸 {filteredMemories.length}/{scopedMemories.length}
                  </span>
                </div>

                <div className="flex-1" />

                <div className="flex-shrink-0 flex items-center rounded-xl border border-emerald-500/20 bg-white/60 p-0.5 backdrop-blur-sm shadow-sm gap-0.5">
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
                      onClick={() => handleSwitchViewMode(mode)}
                      className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        viewMode === mode
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "text-emerald-700 hover:bg-white/90"
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
                  className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md rounded-full px-4 py-1.5 text-[10px] whitespace-nowrap font-bold transition-colors"
                >
                  + Thêm
                </button>
              </div>
            ) : null
          }
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
