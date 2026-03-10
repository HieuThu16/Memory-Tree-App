"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

export default function TreeParticles({ width, height }: { width: number; height: number }) {
  const reduceMotion = useReducedMotion();

  const particles = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    return Array.from({ length: 14 }).map((_, index) => {
      const x = 80 + rand() * (width - 160);
      const y = 60 + rand() * (height - 220);
      return {
        id: index,
        x,
        y,
        r: 2.5 + rand() * 3,
        delay: rand() * 2,
        duration: 5 + rand() * 4,
        drift: 8 + rand() * 12,
      };
    });
  }, [width, height]);

  return (
    <g opacity={0.7}>
      {particles.map((particle) => (
        <motion.circle
          key={particle.id}
          cx={particle.x}
          cy={particle.y}
          r={particle.r}
          fill="#d7a66a"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  opacity: [0, 1, 0.8],
                  y: [0, -particle.drift, 0],
                }
          }
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
          }}
        />
      ))}
    </g>
  );
}
