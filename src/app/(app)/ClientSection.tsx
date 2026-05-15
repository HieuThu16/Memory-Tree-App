"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import type { MemoryRecord } from "@/lib/types";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MEMORY_SELECT, MEMORY_SELECT_LEGACY } from "@/lib/supabase/selects";
import MemoryTree from "@/components/tree/MemoryTree";
import { getPrimaryImageMedia } from "@/lib/media";

const MemoryGallery = dynamic(
  () => import("@/components/memory/MemoryGallery"),
  {
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
        Dang tai thu vien ky niem...
      </div>
    ),
  },
);

const MemoryList = dynamic(() => import("@/components/memory/MemoryList"), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
      Dang tai danh sach ky niem...
    </div>
  ),
});

const MemoryMap = dynamic(() => import("@/components/memory/MemoryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-text-muted animate-pulse">
      Dang tai ban do ky niem...
    </div>
  ),
});

const isMissingMemoryMetadataColumn = (message?: string) => {
  if (!message) return false;
  const lowered = message.toLowerCase();
  return (
    lowered.includes("column") &&
    (lowered.includes("memories.with_whom") ||
      lowered.includes("memories.event_time"))
  );
};

type BrowserMemoryListResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

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
  const addToast = useUiStore((s) => s.addToast);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"tree" | "gallery" | "map" | "list">(
    "tree",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [hasLoadedDetailedMemories, setHasLoadedDetailedMemories] =
    useState(false);
  const [isLoadingDetailedMemories, startDetailedLoadTransition] =
    useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    hydrateScope("personal", memories);
  }, [hydrateScope, memories]);

  useEffect(() => {
    if (
      viewMode === "tree" ||
      viewMode === "map" ||
      hasLoadedDetailedMemories
    ) {
      return;
    }

    startDetailedLoadTransition(async () => {
      const primaryResult = (await supabase
        .from("memories")
        .select(MEMORY_SELECT)
        .is("room_id", null)
        .order("date", {
          ascending: true,
        })) as unknown as BrowserMemoryListResult;

      if (!primaryResult.error) {
        hydrateScope("personal", (primaryResult.data ?? []) as MemoryRecord[]);
        setHasLoadedDetailedMemories(true);
        return;
      }

      if (!isMissingMemoryMetadataColumn(primaryResult.error.message)) {
        addToast("Khong tai duoc du lieu day du cua ky niem.", "error");
        return;
      }

      const legacyResult = (await supabase
        .from("memories")
        .select(MEMORY_SELECT_LEGACY)
        .is("room_id", null)
        .order("date", {
          ascending: true,
        })) as unknown as BrowserMemoryListResult;

      if (legacyResult.error) {
        addToast("Khong tai duoc du lieu day du cua ky niem.", "error");
        return;
      }

      hydrateScope("personal", (legacyResult.data ?? []) as MemoryRecord[]);
      setHasLoadedDetailedMemories(true);
    });
  }, [addToast, hasLoadedDetailedMemories, hydrateScope, supabase, viewMode]);

  const sortedMemories = useMemo(
    () =>
      [...scopedMemories].sort((a, b) => {
        const d1 = new Date(a.date || a.created_at).getTime();
        const d2 = new Date(b.date || b.created_at).getTime();
        return d2 - d1;
      }),
    [scopedMemories],
  );

  const activeSearchQuery =
    viewMode === "tree" ? "" : deferredSearchQuery.trim().toLowerCase();

  const filteredMemories = useMemo(() => {
    if (!activeSearchQuery) {
      return sortedMemories;
    }

    return sortedMemories.filter(
      (memory) =>
        memory.title.toLowerCase().includes(activeSearchQuery) ||
        (memory.category &&
          memory.category.toLowerCase().includes(activeSearchQuery)),
    );
  }, [activeSearchQuery, sortedMemories]);

  const galleryMemories = useMemo(
    () =>
      filteredMemories.filter((memory) => getPrimaryImageMedia(memory.media)),
    [filteredMemories],
  );

  const isTreeMode = viewMode === "tree";

  const handleOpenMemory = (memory: MemoryRecord) => {
    useTreeStore.getState().setSelectedId(memory.id);
    useTreeStore.getState().setIsDetailOpen(true);
  };

  const shouldShowDetailedViewLoader =
    (viewMode === "list" || viewMode === "gallery") &&
    isLoadingDetailedMemories &&
    !hasLoadedDetailedMemories;

  const renderActiveView = () => {
    if (shouldShowDetailedViewLoader) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted animate-pulse">
          Dang tai du lieu chi tiet...
        </div>
      );
    }

    if (viewMode === "tree") {
      return (
        <MemoryTree
          memories={filteredMemories}
          currentUserId={currentUserId ?? undefined}
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
      return <MemoryGallery memories={galleryMemories} />;
    }

    return <MemoryMap memories={filteredMemories} />;
  };

  return (
    <section className="glass-card overflow-hidden rounded-2xl p-2.5 sm:rounded-[30px] sm:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="flex-shrink-0 rounded-full border border-border bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
            🌸{" "}
            {viewMode === "gallery"
              ? galleryMemories.length
              : filteredMemories.length}
            /{scopedMemories.length}
          </span>

          {!isTreeMode ? (
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Tim ky niem..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="input-field w-full !rounded-xl !py-1.5 !pl-7 !text-xs"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                🔍
              </span>
            </div>
          ) : null}

          <div className="flex-1" />

          <div className="flex flex-shrink-0 items-center gap-0.5 rounded-xl border border-border bg-white/60 p-0.5 backdrop-blur-sm">
            {(
              [
                { mode: "tree" as const, icon: "🌳", label: "Cay" },
                { mode: "list" as const, icon: "📋", label: "Danh sach" },
                { mode: "gallery" as const, icon: "🖼️", label: "Thu vien" },
                { mode: "map" as const, icon: "🗺️", label: "Ban do" },
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
            + Them
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
