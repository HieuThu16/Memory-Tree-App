"use client";

import { motion } from "framer-motion";
import { useRealtimeStore } from "@/lib/stores/realtimeStore";

export default function LiveCursor() {
  const cursors = useRealtimeStore((s) => s.cursors);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {cursors.map((c) => (
        <motion.div
          key={c.userId}
          className="absolute"
          animate={{ x: c.x, y: c.y }}
          transition={{
            type: "spring",
            damping: 30,
            stiffness: 250,
            mass: 0.5,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M5.65376 21.2014L2.36873 3.19793C2.15816 2.04353 3.39958 1.14446 4.41733 1.71383L21.3115 11.1661C22.3835 11.7659 22.1382 13.3516 20.9168 13.626L13.916 15.2001C13.5186 15.2894 13.177 15.5413 12.969 15.9038L9.3664 22.1818C8.75051 23.2547 7.08585 22.9553 6.88371 21.7583L5.65376 21.2014Z"
              fill="var(--accent)"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <div className="mt-1 ml-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-surface shadow-md">
            {c.displayName || "Guest"}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
