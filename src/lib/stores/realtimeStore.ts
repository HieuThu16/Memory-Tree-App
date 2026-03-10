"use client";

import { create } from "zustand";

export type CursorPosition = {
  x: number;
  y: number;
  userId: string;
  avatarUrl: string | null;
  displayName: string;
};

export type PresenceState = {
  users: Omit<CursorPosition, "x" | "y">[];
  cursors: CursorPosition[];
  setUsers: (users: Omit<CursorPosition, "x" | "y">[]) => void;
  updateCursor: (cursor: CursorPosition) => void;
  removeCursor: (userId: string) => void;
};

export const useRealtimeStore = create<PresenceState>()((set) => ({
  users: [],
  cursors: [],
  setUsers: (users) => set({ users }),
  updateCursor: (cursor) =>
    set((state) => {
      const existing = state.cursors.findIndex((c) => c.userId === cursor.userId);
      if (existing !== -1) {
        const newCursors = [...state.cursors];
        newCursors[existing] = cursor;
        return { cursors: newCursors };
      }
      return { cursors: [...state.cursors, cursor] };
    }),
  removeCursor: (userId) =>
    set((state) => ({
      cursors: state.cursors.filter((c) => c.userId !== userId),
    })),
}));
