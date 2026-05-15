"use client";

import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { getMediaPublicUrl, getPrimaryMedia } from "@/lib/media";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import {
  flowerConceptFromMemory,
  getFlowerSpeciesByConcept,
  getFlowerThemeClass,
} from "./flowerConcept";

const typeStyles: Record<string, { icon: string; badge: string }> = {
  diary: { icon: "📝", badge: "badge-diary" },
  photo: { icon: "📷", badge: "badge-photo" },
  video: { icon: "🎬", badge: "badge-video" },
  album: { icon: "📚", badge: "badge-album" },
};

const formatDate = (memory: MemoryRecord) => {
  const raw = memory.date ?? memory.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "?";

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return `${day} thg ${month}, ${year}`;
};

const formatCreatedAt = (memory: MemoryRecord) => {
  const date = new Date(memory.created_at);
  if (Number.isNaN(date.getTime())) return "";

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${hour}:${minute} ${day}/${month}/${year}`;
};

const formatEventTime = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

export default function MemoryCard({
  memory,
  onSelect,
  onMediaClick,
  participant,
}: {
  memory: MemoryRecord;
  onSelect?: (memory: MemoryRecord) => void;
  onMediaClick?: (url: string, type: "image" | "video") => void;
  participant?: MemoryParticipant;
  animated?: boolean;
}) {
  const style = typeStyles[memory.type] ?? typeStyles.album;
  const appearance = participant ? getParticipantAppearance(participant) : null;
  // Deterministic pastel color based on ID
  const colors = [
    { bg: "bg-blue-50/80", border: "border-blue-200/50", accent: "bg-blue-500", text: "text-blue-900", sub: "text-blue-700/60" },
    { bg: "bg-pink-50/80", border: "border-pink-200/50", accent: "bg-pink-500", text: "text-pink-900", sub: "text-pink-700/60" },
    { bg: "bg-yellow-50/80", border: "border-yellow-200/50", accent: "bg-yellow-500", text: "text-yellow-950", sub: "text-yellow-800/60" },
    { bg: "bg-emerald-50/80", border: "border-emerald-200/50", accent: "bg-emerald-500", text: "text-emerald-950", sub: "text-emerald-800/60" },
  ];
  const colorIndex = Math.abs(memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const theme = colors[colorIndex];

  return (
    <div
      onClick={() => onSelect?.(memory)}
      className="group relative flex items-start gap-3 py-6 cursor-pointer"
    >
      {/* Left: Date Circle */}
      <div className="flex flex-col items-center shrink-0 w-16">
        <div className={`w-14 h-14 rounded-full ${theme.accent} flex flex-col items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-500 border-4 border-white`}>
          <div className="text-[18px] font-black text-white leading-none">
            {new Date(memory.date || memory.created_at).getDate()}
          </div>
          <div className="text-[8px] font-black uppercase text-white/80 mt-0.5">
            Thg {new Date(memory.date || memory.created_at).getMonth() + 1}
          </div>
        </div>
        <div className={`mt-3 h-20 w-[2px] rounded-full bg-gradient-to-b ${theme.accent.replace('bg-', 'from-')}/30 to-transparent`} />
      </div>

      {/* Right: Content Card - Pastel Colors */}
      <div className={`flex-1 ${theme.bg} rounded-[2.5rem] border-2 ${theme.border} p-6 shadow-sm backdrop-blur-md transition-all duration-500 hover:shadow-xl hover:-translate-y-1`}>
        <div className="flex flex-col gap-3">
          {/* Body */}
          <div className="min-w-0">
            <h3 className={`text-[18px] font-black ${theme.text} leading-tight transition-colors`}>
              {memory.title}
            </h3>
            {memory.content && (
              <p className={`mt-2 text-[13px] ${theme.sub} line-clamp-3 leading-relaxed font-semibold`}>
                {memory.content}
              </p>
            )}
          </div>

          {/* Media Thumbnails */}
          {memory.media && memory.media.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {memory.media.map((m) => {
                const url = getMediaPublicUrl(m.storage_path);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMediaClick?.(url, m.media_type === "video" ? "video" : "image");
                    }}
                    className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white bg-white/40 hover:scale-105 transition-all duration-300 shadow-sm"
                  >
                    <img 
                      src={m.media_type === 'video' ? (m.thumbnail ? getMediaPublicUrl(m.thumbnail) : url) : url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                    {m.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="w-8 h-8 rounded-full bg-white/40 flex items-center justify-center border border-white/50">
                           <span className="text-[10px] text-white ml-0.5">▶</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
