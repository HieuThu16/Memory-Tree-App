"use client";

import { useMemo } from "react";
import type { MemoryRecord, MemoryParticipant } from "@/lib/types";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function MemoryMap({
  memories,
  participantsByUserId,
}: {
  memories: MemoryRecord[];
  participantsByUserId?: Map<string, MemoryParticipant>;
}) {
  const { setSelectedId, setIsDetailOpen } = useTreeStore();
  
  const memoriesWithLocation = useMemo(() => {
    return memories
      .filter((m) => m.location && m.location.trim() !== "")
      .sort((a, b) => {
        const d1 = new Date(a.date || a.created_at).getTime();
        const d2 = new Date(b.date || b.created_at).getTime();
        return d2 - d1; 
      });
  }, [memories]);

  if (memoriesWithLocation.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center text-text-muted px-4 bg-white/40 rounded-2xl border border-dashed border-border mt-2">
        <span className="text-4xl mb-2">🗺️</span>
        <p className="text-sm font-medium">Chưa có dấu chân nào được ghi lại</p>
        <p className="mt-1 text-xs text-text-muted/60 max-w-xs">
          Hãy thêm "Vị trí" vào các kỷ niệm để lưu lại hành trình của sự kiện nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2 mt-2">
      <div className="flex items-center gap-2 px-2">
        <span className="text-xl">🗺️</span>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Nhật ký hành trình</h3>
        <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent ml-auto">
          {memoriesWithLocation.length} địa điểm
        </span>
      </div>
      
      <div className="relative border-l-2 border-dashed border-accent/20 ml-5 pl-5 space-y-6 lg:ml-8 pb-4">
        {memoriesWithLocation.map((mem) => {
          const dateStr = mem.date || mem.created_at
            ? new Intl.DateTimeFormat("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              }).format(new Date(mem.date || mem.created_at))
            : "Ngày ?";
            
          return (
            <div key={mem.id} className="relative">
              {/* Timeline marker */}
              <div className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 border-2 border-white shadow-sm ring-1 ring-accent/30 text-[8px]">
                <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
              </div>
              
              <p className="font-bold text-accent text-xs mb-1.5 flex flex-wrap items-center gap-1.5 bg-white/60 inline-flex px-2 py-1 rounded-lg border border-border/50">
                <span className="text-foreground/80">🗓 {dateStr}</span> 
                <span className="text-text-muted opacity-50">•</span>
                <span>📍 {mem.location}</span>
                {mem.with_whom && (
                  <>
                    <span className="text-text-muted opacity-50">•</span>
                    <span className="text-text-secondary text-[11px] font-medium">👥 {mem.with_whom}</span>
                  </>
                )}
              </p>
              
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(mem.id);
                    setIsDetailOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm transition-all hover:border-accent/40 hover:bg-white hover:text-accent"
                >
                  <span className="truncate max-w-[200px] font-semibold text-foreground/90">{mem.title}</span>
                  <span className="text-accent bg-accent/10 px-2 py-0.5 rounded-md text-[10px]">Xem chi tiết 🌸</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
