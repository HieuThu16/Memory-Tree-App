"use client";

import { useMemo } from "react";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function MemoryMap({
  memories,
  participantsByUserId,
}: {
  memories: MemoryRecord[];
  participantsByUserId?: Map<string, MemoryParticipant>;
}) {
  const setSelectedId = useTreeStore((s) => s.setSelectedId);
  const setIsDetailOpen = useTreeStore((s) => s.setIsDetailOpen);
  void participantsByUserId;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  const memoriesWithLocation = useMemo(
    () =>
      memories
        .filter((memory) => memory.location && memory.location.trim() !== "")
        .sort((a, b) => {
          const d1 = new Date(a.date || a.created_at).getTime();
          const d2 = new Date(b.date || b.created_at).getTime();
          return d2 - d1;
        }),
    [memories],
  );

  if (memoriesWithLocation.length === 0) {
    return (
      <div className="mt-2 flex h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/40 px-4 text-center text-text-muted">
        <span className="mb-2 text-4xl">🗺️</span>
        <p className="text-sm font-medium">Chưa có dấu chân nào được ghi lại</p>
        <p className="mt-1 max-w-xs text-xs text-text-muted/60">
          Hãy thêm &quot;Vị trí&quot; vào các kỷ niệm để lưu lại hành trình của
          sự kiện nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4 py-2">
      <div className="flex items-center gap-2 px-2">
        <span className="text-xl">🗺️</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Nhật ký hành trình
        </h3>
        <span className="ml-auto rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
          {memoriesWithLocation.length} địa điểm
        </span>
      </div>

      <div className="relative ml-5 space-y-6 border-l-2 border-dashed border-accent/20 pb-4 pl-5 lg:ml-8">
        {memoriesWithLocation.map((memory) => {
          const dateValue = memory.date || memory.created_at;
          const dateStr = dateValue
            ? dateFormatter.format(new Date(dateValue))
            : "Ngày ?";

          return (
            <div key={memory.id} className="relative">
              <div className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-accent/20 text-[8px] shadow-sm ring-1 ring-accent/30">
                <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              </div>

              <p className="mb-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-border/50 bg-white/60 px-2 py-1 text-xs font-bold text-accent">
                <span className="text-foreground/80">🗓 {dateStr}</span>
                <span className="text-text-muted opacity-50">•</span>
                <span>📍 {memory.location}</span>
                {memory.with_whom && (
                  <>
                    <span className="text-text-muted opacity-50">•</span>
                    <span className="text-[11px] font-medium text-text-secondary">
                      👥 {memory.with_whom}
                    </span>
                  </>
                )}
              </p>

              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(memory.id);
                    setIsDetailOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm transition-all hover:border-accent/40 hover:bg-white hover:text-accent"
                >
                  <span className="max-w-[200px] truncate font-semibold text-foreground/90">
                    {memory.title}
                  </span>
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                    Xem chi tiết 🌸
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
