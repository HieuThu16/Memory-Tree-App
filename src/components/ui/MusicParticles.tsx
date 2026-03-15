"use client";
import { useEffect, useState, memo } from "react";

function MusicParticles() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const symbols = ["🎵", "🎶", "🎼", "🎸", "🎧", "🎤"];
    const items = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 14 + Math.random() * 20,
      delay: Math.random() * -10,
      duration: 10 + Math.random() * 8,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
    }));
    setParticles(items);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden opacity-60">
      <style>
        {`
          @keyframes float-music {
            0% { transform: translateY(110vh) scale(0.8) rotate(-15deg); opacity: 0; }
            20% { opacity: 0.8; transform: translateY(60vh) scale(1) rotate(15deg); }
            80% { opacity: 0.8; transform: translateY(20vh) scale(1.1) rotate(-10deg); }
            100% { transform: translateY(-10vh) scale(0.9) rotate(20deg); opacity: 0; }
          }
          .music-particle {
            position: absolute;
            animation: float-music linear infinite;
          }
        `}
      </style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="music-particle drop-shadow-[0_2px_5px_rgba(95,79,161,0.2)]"
          style={{
            left: `${p.x}%`,
            fontSize: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}

export default memo(MusicParticles);
