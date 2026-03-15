"use client";

import { memo, useMemo, useEffect, useState } from "react";

function TreeParticlesLayer({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const [season, setSeason] = useState<
    "spring" | "summer" | "autumn" | "winter"
  >("spring");

  useEffect(() => {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) setSeason("spring");
    else if (month >= 6 && month <= 8) setSeason("summer");
    else if (month >= 9 && month <= 11) setSeason("autumn");
    else setSeason("winter");
  }, []);

  const particles = useMemo(() => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const baseCount = season === "winter" ? 40 : season === "spring" ? 35 : 22;
    const count = baseCount;

    type Direction =
      | "fall"
      | "rise"
      | "drift-left"
      | "drift-right"
      | "diagonal-left"
      | "diagonal-right";
    const directions: Direction[] = [
      "fall",
      "rise",
      "drift-left",
      "drift-right",
      "diagonal-left",
      "diagonal-right",
    ];

    return Array.from({ length: count }).map((_, index) => {
      const x = Math.round((10 + rand() * (width - 20)) * 100) / 100;
      const y = Math.round(rand() * Math.max(200, height - 100) * 100) / 100;
      const duration = Math.round((10 + rand() * 22) * 100) / 100;
      const delay = Math.round(rand() * -28 * 100) / 100;

      let symbol = "🌸";
      if (season === "spring") {
        const r = rand();
        if (r > 0.7) symbol = "🦋";
        else if (r > 0.5) symbol = "🌺";
        else if (r > 0.35) symbol = "🌼";
        else if (r > 0.2) symbol = "💮";
        else symbol = "🌸";
      }
      if (season === "summer") {
        const r = rand();
        if (r > 0.7) symbol = "☀️";
        else if (r > 0.5) symbol = "🦋";
        else if (r > 0.3) symbol = "🍃";
        else symbol = "🌻";
      }
      if (season === "autumn") {
        const r = rand();
        if (r > 0.6) symbol = "🍂";
        else if (r > 0.3) symbol = "🍁";
        else symbol = "🍃";
      }
      if (season === "winter") {
        const r = rand();
        if (r > 0.7) symbol = "❄️";
        else if (r > 0.4) symbol = "❆";
        else symbol = "✨";
      }

      const direction = directions[Math.floor(rand() * directions.length)];

      return {
        id: index,
        x,
        y,
        symbol,
        duration,
        delay,
        direction,
        size:
          Math.round(
            (season === "winter" ? 6 + rand() * 8 : 10 + rand() * 12) * 100,
          ) / 100,
        opacity: Math.round((0.3 + rand() * 0.5) * 100) / 100,
      };
    });
  }, [width, height, season]);

  return (
    <g>
      <style>
        {`
          @keyframes tree-fall {
            0% { transform: translateY(-30px) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.7); }
            90% { opacity: var(--tp-opacity, 0.7); }
            100% { transform: translate(40px, 450px) rotate(360deg); opacity: 0; }
          }
          @keyframes tree-rise {
            0% { transform: translateY(300px) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.5); }
            90% { opacity: var(--tp-opacity, 0.5); }
            100% { transform: translate(-20px, -300px) rotate(-360deg); opacity: 0; }
          }
          @keyframes tree-drift-left {
            0% { transform: translate(200px, 0) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.6); }
            50% { transform: translate(0px, 60px) rotate(180deg); }
            90% { opacity: var(--tp-opacity, 0.6); }
            100% { transform: translate(-200px, 20px) rotate(360deg); opacity: 0; }
          }
          @keyframes tree-drift-right {
            0% { transform: translate(-200px, 0) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.6); }
            50% { transform: translate(0px, -40px) rotate(180deg); }
            90% { opacity: var(--tp-opacity, 0.6); }
            100% { transform: translate(200px, -20px) rotate(360deg); opacity: 0; }
          }
          @keyframes tree-diagonal-left {
            0% { transform: translate(160px, -100px) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.5); }
            90% { opacity: var(--tp-opacity, 0.5); }
            100% { transform: translate(-160px, 400px) rotate(360deg); opacity: 0; }
          }
          @keyframes tree-diagonal-right {
            0% { transform: translate(-160px, -100px) rotate(0deg); opacity: 0; }
            8% { opacity: var(--tp-opacity, 0.5); }
            90% { opacity: var(--tp-opacity, 0.5); }
            100% { transform: translate(160px, 400px) rotate(360deg); opacity: 0; }
          }
          .tp-fall { animation: tree-fall linear infinite; }
          .tp-rise { animation: tree-rise linear infinite; }
          .tp-drift-left { animation: tree-drift-left linear infinite; }
          .tp-drift-right { animation: tree-drift-right linear infinite; }
          .tp-diagonal-left { animation: tree-diagonal-left linear infinite; }
          .tp-diagonal-right { animation: tree-diagonal-right linear infinite; }
        `}
      </style>
      {particles.map((p) => {
        const animClass = `tp-${p.direction}`;
        return (
          <g
            key={p.id}
            className={animClass}
            style={{
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              transformOrigin: `${p.x}px ${p.y}px`,
              // @ts-expect-error CSS custom property in SVG
              "--tp-opacity": p.opacity,
            }}
          >
            {season === "winter" && p.symbol === "❆" ? (
              <circle
                cx={p.x}
                cy={p.y}
                r={p.size / 2}
                fill="#A7C7E7"
                opacity={p.opacity}
              />
            ) : (
              <text
                x={p.x}
                y={p.y}
                fontSize={p.size}
                opacity={p.opacity}
                textAnchor="middle"
              >
                {p.symbol}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default memo(TreeParticlesLayer);
