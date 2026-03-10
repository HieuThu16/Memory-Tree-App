"use client";

import { motion } from "framer-motion";
import type { MemoryRecord } from "@/lib/types";

const typeStyles: Record<string, { icon: string; badge: string }> = {
  diary: { icon: "📝", badge: "badge-diary" },
  photo: { icon: "📷", badge: "badge-photo" },
  video: { icon: "🎬", badge: "badge-video" },
  album: { icon: "📚", badge: "badge-album" },
};

const formatDate = (memory: MemoryRecord) => {
  const raw = memory.date ?? memory.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function MemoryCard({
  memory,
  index = 0,
  onSelect,
}: {
  memory: MemoryRecord;
  index?: number;
  onSelect?: (memory: MemoryRecord) => void;
}) {
  const style = typeStyles[memory.type] ?? typeStyles.diary;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect?.(memory)}
      className="glass-card glass-card-hover group w-full rounded-2xl p-5 text-left"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className={`badge ${style.badge}`}>
            {style.icon} {memory.type}
          </span>
          <h3 className="mt-2.5 text-base font-semibold text-foreground group-hover:text-accent transition-colors">
            {memory.title}
          </h3>
          {memory.content && (
            <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">
              {memory.content}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-text-muted">
        {formatDate(memory)}
      </p>
    </motion.button>
  );
}
