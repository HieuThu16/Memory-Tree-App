"use client";

import { motion } from "framer-motion";
import { useTreeStore } from "@/lib/stores/treeStore";
import type { MemoryParticipant, MemoryRecord } from "@/lib/types";
import MemoryCard from "./MemoryCard";
import { deleteMemory } from "@/lib/actions";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { useTransition } from "react";

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
  const setEditingMemory = useTreeStore((s) => s.setEditingMemory);
  const removeMemory = useMemoryStore((s) => s.removeMemory);
  const addToast = useUiStore((s) => s.addToast);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDelete = (memoryId: string) => {
    if (!confirm("Bạn có chắc muốn xóa kỉ niệm này?")) return;
    startDeleteTransition(async () => {
      const result = await deleteMemory(memoryId);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        removeMemory(memoryId);
        addToast("Đã xóa kỉ niệm 🍂", "success");
      }
    });
  };

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
        <div key={memory.id} className="relative group">
          <MemoryCard
            memory={memory}
            index={index}
            onSelect={onSelect}
            participant={participantsByUserId?.get(memory.user_id)}
            animated={animated}
          />
          {/* Action buttons (Edit/Delete) overlay */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingMemory(memory);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 border border-border shadow-sm text-text-secondary hover:text-accent hover:border-accent"
              title="Sửa"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(memory.id);
              }}
              disabled={isDeleting}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 border border-border shadow-sm text-text-secondary hover:text-rose hover:border-rose disabled:opacity-50"
              title="Xóa"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
