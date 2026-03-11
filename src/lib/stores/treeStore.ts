"use client";

import { create } from "zustand";
import type { MemoryRecord } from "@/lib/types";

export type TreeState = {
  selectedId: string | null;
  isCreateOpen: boolean;
  isDetailOpen: boolean;
  editingMemory: MemoryRecord | null;
  targetRoomId: string | null;
  setSelectedId: (id: string | null) => void;
  toggleSelectedId: (id: string) => void;
  setIsDetailOpen: (open: boolean) => void;
  openCreate: (roomId?: string) => void;
  closeCreate: () => void;
  setEditingMemory: (memory: MemoryRecord | null) => void;
};

export const useTreeStore = create<TreeState>()((set) => ({
  selectedId: null,
  isCreateOpen: false,
  isDetailOpen: false,
  editingMemory: null,
  targetRoomId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  toggleSelectedId: (id) =>
    set((state) => ({ selectedId: state.selectedId === id ? null : id })),
  setIsDetailOpen: (open) => set({ isDetailOpen: open }),
  openCreate: (roomId?: string) =>
    set({ isCreateOpen: true, targetRoomId: roomId ?? null }),
  closeCreate: () =>
    set({ isCreateOpen: false, editingMemory: null, targetRoomId: null }),
  setEditingMemory: (memory) => set({ editingMemory: memory, isCreateOpen: true }),
}));
