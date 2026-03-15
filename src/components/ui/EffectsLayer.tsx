"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function EffectsLayer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-[-1] opacity-40 mix-blend-screen">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-1/4 -top-1/4 h-[80vh] w-[80vw] rounded-full bg-gradient-to-tr from-cyan-400 via-emerald-300 to-transparent blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, -40, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-1/4 -right-1/4 h-[80vh] w-[80vw] rounded-full bg-gradient-to-bl from-purple-500 via-pink-300 to-transparent blur-[120px]"
        />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none" />
    </div>
  );
}
