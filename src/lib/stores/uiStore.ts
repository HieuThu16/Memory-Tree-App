"use client";

import { create } from "zustand";

export type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export type UiState = {
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
};

let toastCounter = 0;

export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  addToast: (message, type = "info") => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
