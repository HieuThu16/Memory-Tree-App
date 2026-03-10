"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "@/lib/stores/uiStore";

export default function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-24 right-6 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`glass-card flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-[var(--shadow-float)] ${
              toast.type === "error"
                ? "border-rose/30"
                : toast.type === "success"
                  ? "border-green/30"
                  : ""
            }`}
          >
            <span className="text-lg">
              {toast.type === "success"
                ? "✅"
                : toast.type === "error"
                  ? "❌"
                  : "ℹ️"}
            </span>
            <p className="text-sm font-medium text-foreground">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-text-muted hover:text-foreground transition"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
