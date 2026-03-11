"use client";

import { motion } from "framer-motion";
import { useTreeStore } from "@/lib/stores/treeStore";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import MemoryCard from "./MemoryCard";

export default function MemoryList({
  memories,
  onSelect,
  participantsByUserId,
  animated = true,
}: {
  memories: MemoryRecord[];
  onSelect?: (memory: MemoryRecord) => void;
  participantsByUserId?: Map<string, MemoryParticipant>;
  animated?: boolean;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);

  if (memories.length === 0) {
    return (
      <motion.div
        className="glass-card flex flex-col items-center justify-center rounded-2xl p-8 text-center"
        initial={animated ? { opacity: 0, y: 20 } : false}
        animate={animated ? { opacity: 1, y: 0 } : undefined}
        transition={animated ? { duration: 0.24 } : undefined}
      >
        <div className="text-4xl">🌱</div>
        <h3 className="mt-3 text-base text-foreground">
          Chưa có kỉ niệm nào
        </h3>
        <button
          type="button"
          onClick={() => openCreate()}
          className="btn-primary mt-4 px-5 py-2.5 text-sm"
        >
          Tạo kỉ niệm 🌸
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {memories.map((memory, index) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          index={index}
          onSelect={onSelect}
          participant={participantsByUserId?.get(memory.user_id)}
          animated={animated}
        />
      ))}
    </div>
  );
}
