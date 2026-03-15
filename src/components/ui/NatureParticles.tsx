"use client";
import { useEffect, useState, memo } from "react";

type ParticleDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "diagonal-ul"
  | "diagonal-ur"
  | "diagonal-dl"
  | "diagonal-dr";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  symbol: string;
  direction: ParticleDirection;
  opacity: number;
}

const SYMBOLS = [
  "🦋",
  "🌸",
  "✨",
  "🌺",
  "🌼",
  "🍃",
  "💮",
  "🌷",
  "🌹",
  "🐝",
  "🪻",
  "🌻",
  "💐",
];
const BUTTERFLY_SYMBOLS = ["🦋", "🦋", "🦋"]; // More butterflies
const FLOWER_SYMBOLS = ["🌸", "🌺", "🌼", "💮", "🌷", "🌹", "🪻", "🌻", "💐"];

const DIRECTIONS: ParticleDirection[] = [
  "up",
  "down",
  "left",
  "right",
  "diagonal-ul",
  "diagonal-ur",
  "diagonal-dl",
  "diagonal-dr",
];

function NatureParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = [];

    // More butterflies flying in various directions
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 16 + Math.random() * 14,
        delay: Math.random() * -12,
        duration: 12 + Math.random() * 18,
        symbol:
          BUTTERFLY_SYMBOLS[
            Math.floor(Math.random() * BUTTERFLY_SYMBOLS.length)
          ],
        direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
        opacity: 0.5 + Math.random() * 0.4,
      });
    }

    // Flowers floating up, down and diagonal
    for (let i = 12; i < 30; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 10 + Math.random() * 16,
        delay: Math.random() * -15,
        duration: 14 + Math.random() * 20,
        symbol:
          FLOWER_SYMBOLS[Math.floor(Math.random() * FLOWER_SYMBOLS.length)],
        direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
        opacity: 0.3 + Math.random() * 0.45,
      });
    }

    // Sparkles scattered everywhere
    for (let i = 30; i < 42; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 8 + Math.random() * 10,
        delay: Math.random() * -8,
        duration: 8 + Math.random() * 12,
        symbol: Math.random() > 0.4 ? "✨" : "🍃",
        direction: DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)],
        opacity: 0.3 + Math.random() * 0.35,
      });
    }

    setParticles(items);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      <style>
        {`
          /* Vertical directions */
          @keyframes fly-up {
            0% { transform: translateY(110vh) translateX(0) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translateY(50vh) translateX(30px) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translateY(-15vh) translateX(-10px) rotate(360deg); opacity: 0; }
          }
          @keyframes fly-down {
            0% { transform: translateY(-15vh) translateX(0) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translateY(50vh) translateX(-25px) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translateY(115vh) translateX(15px) rotate(360deg); opacity: 0; }
          }
          /* Horizontal directions */
          @keyframes fly-left {
            0% { transform: translateX(110vw) translateY(0) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translateX(50vw) translateY(20px) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translateX(-15vw) translateY(-10px) rotate(360deg); opacity: 0; }
          }
          @keyframes fly-right {
            0% { transform: translateX(-15vw) translateY(0) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translateX(50vw) translateY(-20px) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translateX(110vw) translateY(10px) rotate(360deg); opacity: 0; }
          }
          /* Diagonal directions */
          @keyframes fly-diagonal-ul {
            0% { transform: translate(110vw, 110vh) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translate(55vw, 55vh) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translate(-15vw, -15vh) rotate(360deg); opacity: 0; }
          }
          @keyframes fly-diagonal-ur {
            0% { transform: translate(-15vw, 110vh) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translate(45vw, 55vh) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translate(110vw, -15vh) rotate(360deg); opacity: 0; }
          }
          @keyframes fly-diagonal-dl {
            0% { transform: translate(110vw, -15vh) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translate(55vw, 45vh) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translate(-15vw, 110vh) rotate(360deg); opacity: 0; }
          }
          @keyframes fly-diagonal-dr {
            0% { transform: translate(-15vw, -15vh) rotate(0deg); opacity: 0; }
            5% { opacity: var(--p-opacity); }
            50% { transform: translate(45vw, 45vh) rotate(180deg); }
            90% { opacity: var(--p-opacity); }
            100% { transform: translate(110vw, 110vh) rotate(360deg); opacity: 0; }
          }
          .nature-up { position: absolute; animation: fly-up linear infinite; }
          .nature-down { position: absolute; animation: fly-down linear infinite; }
          .nature-left { position: absolute; animation: fly-left linear infinite; }
          .nature-right { position: absolute; animation: fly-right linear infinite; }
          .nature-diagonal-ul { position: absolute; animation: fly-diagonal-ul linear infinite; }
          .nature-diagonal-ur { position: absolute; animation: fly-diagonal-ur linear infinite; }
          .nature-diagonal-dl { position: absolute; animation: fly-diagonal-dl linear infinite; }
          .nature-diagonal-dr { position: absolute; animation: fly-diagonal-dr linear infinite; }
        `}
      </style>
      {particles.map((p) => {
        const className = `nature-${p.direction} drop-shadow-[0_2px_4px_rgba(0,0,0,0.08)]`;
        return (
          <div
            key={p.id}
            className={className}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              // @ts-expect-error CSS custom property
              "--p-opacity": p.opacity,
            }}
          >
            {p.symbol}
          </div>
        );
      })}
    </div>
  );
}

export default memo(NatureParticles);
