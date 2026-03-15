"use client";

import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import { getMediaPublicUrl, getPrimaryMedia } from "@/lib/media";

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
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatCreatedAt = (memory: MemoryRecord) => {
  const date = new Date(memory.created_at);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatEventTime = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

export default function MemoryCard({
  memory,
  index = 0,
  onSelect,
  participant,
  animated = true,
}: {
  memory: MemoryRecord;
  index?: number;
  onSelect?: (memory: MemoryRecord) => void;
  participant?: MemoryParticipant;
  animated?: boolean;
}) {
  const style = typeStyles[memory.type] ?? typeStyles.album;
  const appearance = participant ? getParticipantAppearance(participant) : null;
  const primaryMedia = getPrimaryMedia(memory.media);
  const mediaUrl = primaryMedia
    ? getMediaPublicUrl(primaryMedia.storage_path)
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(memory)}
      className="glass-card glass-card-hover group w-full rounded-xl p-3 text-left sm:rounded-2xl sm:p-4"
    >
      {primaryMedia && mediaUrl ? (
        <div className="mb-3 overflow-hidden rounded-lg border border-border bg-white/65 sm:rounded-xl">
          {primaryMedia.media_type === "video" ? (
            <div className="relative">
              <video
                src={mediaUrl}
                className="aspect-[4/3] w-full object-contain bg-slate-950/4 p-1"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[9px] text-white">
                🎬
              </div>
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt={memory.title}
              className="aspect-[4/3] w-full object-contain bg-slate-950/4 p-1"
            />
          )}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`badge ${style.badge} !px-2 !py-0.5 !text-[9px]`}>
              {style.icon}
            </span>
            {appearance ? (
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[6px] font-bold"
                style={{
                  backgroundColor: appearance.softColor,
                  color: appearance.strongColor,
                }}
                title={appearance.displayName}
              >
                {appearance.initials.slice(0, 2)}
              </div>
            ) : null}
          </div>
          <h3 className="mt-1.5 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-accent">
            {memory.title}
          </h3>
          {memory.content && (
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
              {memory.content}
            </p>
          )}
          {memory.category || memory.location ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {memory.category ? (
                <span className="rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] font-medium text-text-secondary">
                  ✿ {memory.category}
                </span>
              ) : null}
              {memory.with_whom ? (
                <span className="rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] font-medium text-text-secondary">
                  👥 {memory.with_whom}
                </span>
              ) : null}
              {memory.location ? (
                <span className="rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] font-medium text-text-secondary">
                  📍 {memory.location}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
        <span>🗓 {formatDate(memory)}</span>
        {memory.event_time ? (
          <>
            <span className="opacity-50">•</span>
            <span>🕒 {formatEventTime(memory.event_time)}</span>
          </>
        ) : null}
        <span className="opacity-50">•</span>
        <span className="opacity-70">🕐 {formatCreatedAt(memory)}</span>
      </div>
    </button>
  );
}
