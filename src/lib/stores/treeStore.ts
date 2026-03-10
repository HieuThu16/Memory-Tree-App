"use client";

import { create } from "zustand";

export type TreeState = {
  selectedId: string | null;
  isCreateOpen: boolean;
  editingId: string | null;
  targetRoomId: string | null;
  setSelectedId: (id: string | null) => void;
  openCreate: (roomId?: string) => void;
  closeCreate: () => void;
  setEditingId: (id: string | null) => void;
};

export const useTreeStore = create<TreeState>()((set) => ({
  selectedId: null,
  isCreateOpen: false,
  editingId: null,
  targetRoomId: null,
  setSelectedId: (id) => set({ selectedId: id }),
  openCreate: (roomId?: string) => set({ isCreateOpen: true, targetRoomId: roomId ?? null }),
  closeCreate: () => set({ isCreateOpen: false, editingId: null, targetRoomId: null }),
  setEditingId: (id) => set({ editingId: id, isCreateOpen: true }),
}));
