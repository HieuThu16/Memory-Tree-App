"use client";

import { useEffect, useMemo, useState } from "react";
import MemoryTree from "@/components/tree/MemoryTree";
import MemoryGallery from "@/components/memory/MemoryGallery";
import type { MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function ClientSection({
  memories,
}: {
  memories: MemoryRecord[];
}) {
  const openCreate = useTreeStore((s) => s.openCreate);
  const hydrateScope = useMemoryStore((s) => s.hydrateScope);
  const scopedMemories = useMemoryStore((s) =>
    s.scopeKey === "personal" ? s.memories : memories,
  );
  const [viewMode, setViewMode] = useState<"tree" | "gallery">("tree");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    hydrateScope("personal", memories);
  }, [hydrateScope, memories]);

  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return scopedMemories;
    const lowerQ = searchQuery.toLowerCase();
    return scopedMemories.filter(
      (m) =>
        m.title.toLowerCase().includes(lowerQ) ||
        (m.category && m.category.toLowerCase().includes(lowerQ)),
    );
  }, [scopedMemories, searchQuery]);

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-3">
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
              placeholder="Tìm kỉ niệm (Vd: Du lịch ✈️, Sinh nhật 🎂)..."
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
          <MemoryTree memories={filteredMemories} />
        </div>
        {viewMode === "gallery" && (
          <MemoryGallery memories={filteredMemories} />
        )}
      </div>
    </section>
  );
}
