"use client";

import { memo, useMemo } from "react";

function TreeParticlesLayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const particles = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    return Array.from({ length: 6 }).map((_, index) => {
      const x = 80 + rand() * (width - 160);
      const y = 56 + rand() * Math.max(120, height - 180);
      return {
        id: index,
        x,
        y,
        r: 2.5 + rand() * 2,
      };
    });
  }, [width, height]);

  return (
    <g opacity={0.46}>
      {particles.map((particle) => (
        <circle
          key={particle.id}
          cx={particle.x}
          cy={particle.y}
          r={particle.r}
          fill={particle.id % 2 === 0 ? "#b7a4ff" : "#88d8ab"}
        />
      ))}
    </g>
  );
}

export default memo(TreeParticlesLayer);
