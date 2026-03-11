"use client";

import type { MemoryRecord, MemoryParticipant } from "@/lib/types";
import { useTreeStore } from "@/lib/stores/treeStore";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function MemoryGallery({
  memories,
  participantsByUserId,
}: {
  memories: MemoryRecord[];
  participantsByUserId?: Map<string, MemoryParticipant>;
}) {
  const setSelectedId = useTreeStore((s) => s.setSelectedId);
  const setIsDetailOpen = useTreeStore((s) => s.setIsDetailOpen);
  const supabase = createSupabaseBrowserClient();

  const getMediaUrl = (path: string) => {
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const handleOpenMemory = (id: string) => {
    setSelectedId(id);
    setIsDetailOpen(true);
  };

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
        <span className="text-4xl">🍃</span>
        <p className="mt-2 text-sm">Chưa có kỉ niệm / ảnh nào...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-1">
      {memories.map((memory) => {
        const coverMedia = memory.media?.[0];
        const owner = participantsByUserId?.get(memory.user_id);
        const appearance = owner ? getParticipantAppearance(owner) : null;

        return (
          <div
            key={memory.id}
            onClick={() => handleOpenMemory(memory.id)}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-white/40 shadow-sm border border-white transition-all hover:scale-[1.02] hover:shadow-md"
          >
            {/* Background Media or Fallback Gradient */}
            {coverMedia ? (
              <img
                src={getMediaUrl(coverMedia.storage_path)}
                alt={memory.title}
                className="h-full w-full object-cover transition duration-300"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-white to-orange-50/50">
                <span className="text-3xl mb-1 drop-shadow-sm">
                  {memory.category === "✈️" ? "✈️" : memory.category === "🎂" ? "🎂" : memory.category || "🌸"}
                </span>
              </div>
            )}
            
            {/* Content Overlay */}
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6 text-white transition-opacity ${
              coverMedia ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}>
               <p className="truncate text-[11px] font-semibold tracking-wide drop-shadow-md">{memory.title}</p>
               <p className="text-[9px] font-medium opacity-80 drop-shadow-md">
                 {memory.date ? new Date(memory.date).toLocaleDateString("vi-VN") : ""}
               </p>
            </div>
            
            {/* Participant Avatar */}
            {appearance && (
               <div
                 className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white text-[7px] font-bold shadow-sm"
                 style={{ backgroundColor: appearance.softColor, color: appearance.strongColor }}
                 title={appearance.displayName}
               >
                 {appearance.initials.slice(0, 2)}
               </div>
            )}
            
            {/* Multiple media indicator */}
            {memory.media && memory.media.length > 1 && (
               <div className="absolute right-1.5 top-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[8px] font-semibold tracking-wider text-white backdrop-blur shadow-sm">
                   +{memory.media.length - 1} 📷
               </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
