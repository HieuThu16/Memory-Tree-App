"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { getMediaPublicUrl, getPrimaryImageMedia } from "@/lib/media";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import { useTreeStore } from "@/lib/stores/treeStore";

export default function MemoryGallery({
  memories,
  participantsByUserId,
}: {
  memories: MemoryRecord[];
  participantsByUserId?: Map<string, MemoryParticipant>;
}) {
  const setSelectedId = useTreeStore((s) => s.setSelectedId);
  const setIsDetailOpen = useTreeStore((s) => s.setIsDetailOpen);

  const galleryItems = useMemo(
    () =>
      memories.flatMap((memory) => {
        const coverMedia = getPrimaryImageMedia(memory.media);

        if (!coverMedia) {
          return [];
        }

        const owner = participantsByUserId?.get(memory.user_id);
        const appearance = owner ? getParticipantAppearance(owner) : null;

        return [
          {
            memory,
            appearance,
            coverUrl: getMediaPublicUrl(coverMedia.storage_path),
          },
        ];
      }),
    [memories, participantsByUserId],
  );

  const handleOpenMemory = (id: string) => {
    setSelectedId(id);
    setIsDetailOpen(true);
  };

  if (!galleryItems.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
        <span className="text-4xl">🖼️</span>
        <p className="mt-2 text-sm">Chua co ky niem nao co anh...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {galleryItems.map(({ memory, coverUrl, appearance }, index) => (
        <button
          type="button"
          key={memory.id}
          onClick={() => handleOpenMemory(memory.id)}
          className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-white bg-white/40 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label={`Xem chi tiet ky niem ${memory.title}`}
        >
          <Image
            src={coverUrl}
            alt={memory.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain bg-slate-950/4 p-1 transition duration-300"
            priority={index === 0}
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6 text-white transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <p className="break-words whitespace-normal text-[11px] font-semibold tracking-wide drop-shadow-md">
              {memory.title}
            </p>
            {memory.category ? (
              <p className="mt-0.5 truncate text-[9px] font-medium opacity-90 drop-shadow-md">
                ✿ {memory.category}
              </p>
            ) : null}
            <p className="text-[9px] font-medium opacity-80 drop-shadow-md">
              {memory.date
                ? new Date(memory.date).toLocaleDateString("vi-VN")
                : ""}
            </p>
          </div>

          {appearance ? (
            <div
              className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-white/85 text-[7px] font-bold text-rose-700 shadow-sm"
              title={appearance.displayName}
            >
              {appearance.initials.slice(0, 2)}
            </div>
          ) : null}

          {memory.media && memory.media.length > 1 ? (
            <div className="absolute right-1.5 top-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[8px] font-semibold tracking-wider text-white shadow-sm backdrop-blur">
              +{memory.media.length - 1} 📷
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
