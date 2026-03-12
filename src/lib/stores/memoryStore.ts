"use client";

import { create } from "zustand";
import type { MemoryEditHistoryRecord, MemoryRecord } from "@/lib/types";

type MemoryStoreState = {
  scopeKey: string | null;
  memories: MemoryRecord[];
  histories: Record<string, MemoryEditHistoryRecord[]>;
  hydrateScope: (scopeKey: string, memories: MemoryRecord[]) => void;
  upsertMemory: (memory: MemoryRecord) => void;
  removeMemory: (memoryId: string) => void;
  setHistory: (memoryId: string, entries: MemoryEditHistoryRecord[]) => void;
  prependHistory: (
    memoryId: string,
    entries: MemoryEditHistoryRecord[],
  ) => void;
};

export const useMemoryStore = create<MemoryStoreState>()((set) => ({
  scopeKey: null,
  memories: [],
  histories: {},
  hydrateScope: (scopeKey, memories) =>
    set((state) => {
      if (state.scopeKey === scopeKey) {
        const currentIds = state.memories.map((memory) => memory.id).join("|");
        const nextIds = memories.map((memory) => memory.id).join("|");

        if (currentIds === nextIds) {
          return state;
        }
      }

      return {
        scopeKey,
        memories,
        histories: state.scopeKey === scopeKey ? state.histories : {},
      };
    }),
  upsertMemory: (memory) =>
    set((state) => {
      const existingIndex = state.memories.findIndex(
        (current) => current.id === memory.id,
      );

      if (existingIndex === -1) {
        return {
          memories: [memory, ...state.memories].sort((left, right) => {
            const leftDate = new Date(left.date ?? left.created_at).getTime();
            const rightDate = new Date(
              right.date ?? right.created_at,
            ).getTime();
            return leftDate - rightDate;
          }),
        };
      }

      return {
        memories: state.memories.map((current) =>
          current.id === memory.id ? memory : current,
        ),
      };
    }),
  removeMemory: (memoryId) =>
    set((state) => {
      const nextHistories = { ...state.histories };
      delete nextHistories[memoryId];

      return {
        memories: state.memories.filter((memory) => memory.id !== memoryId),
        histories: nextHistories,
      };
    }),
  setHistory: (memoryId, entries) =>
    set((state) => ({
      histories: {
        ...state.histories,
        [memoryId]: entries,
      },
    })),
  prependHistory: (memoryId, entries) =>
    set((state) => ({
      histories: {
        ...state.histories,
        [memoryId]: [...entries, ...(state.histories[memoryId] ?? [])],
      },
    })),
}));
