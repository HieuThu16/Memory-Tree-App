"use client";

import { motion } from "framer-motion";
import { useTreeStore } from "@/lib/stores/treeStore";
import type { MemoryRecord } from "@/lib/types";
import MemoryCard from "./MemoryCard";

export default function MemoryList({
  memories,
  onSelect,
}: {
  memories: MemoryRecord[];
  onSelect?: (memory: MemoryRecord) => void;
}) {
  const openCreate = useTreeStore((s) => s.openCreate);

  if (memories.length === 0) {
    return (
      <motion.div
        className="glass-card flex flex-col items-center justify-center rounded-3xl p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-5xl">🌱</div>
        <h3 className="mt-4 text-xl text-foreground">
          Cây đang chờ mầm đầu tiên
        </h3>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Hãy tạo kỷ niệm đầu tiên để cây bắt đầu lớn lên. Mỗi kỷ niệm là
          một chiếc lá mới trên cành.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary mt-6 px-6 py-3 text-sm"
        >
          Tạo kỷ niệm đầu tiên ✨
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {memories.map((memory, index) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
