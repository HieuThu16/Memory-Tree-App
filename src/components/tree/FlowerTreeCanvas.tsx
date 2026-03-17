"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemoryRecord } from "@/lib/types";
import {
  FLOWER_COMPONENTS,
  FLOWER_PALETTES,
  normalizeFlowerConcept,
} from "./flowers";
import {
  flowerConceptFromMemory,
  getFlowerSpeciesByConcept,
} from "../memory/flowerConcept";

type YearBucket = {
  year: number;
  months: Map<number, MemoryRecord[]>;
};

type FlowerTreeCanvasProps = {
  memories: MemoryRecord[];
  selectedMemoryId: string | null;
  onMemoryClick: (memoryId: string) => void;
  onExportSvgChange: (svg: SVGSVGElement | null) => void;
};

type SeasonDef = {
  id: number;
  months: number[];
  col: string;
  dark: string;
  light: string;
  bg: string;
  fill: string;
  circles: Array<[number, number, number]>;
};

const SEASONS: SeasonDef[] = [
  {
    id: 1,
    months: [1, 2, 3],
    col: "#8ec9b4",
    dark: "#5f9e87",
    light: "#dff3ea",
    bg: "#f3fbf8",
    fill: "#bde8d6",
    circles: [
      [124, 90, 110],
      [92, 70, 65],
      [164, 70, 68],
      [122, 132, 68],
      [168, 110, 62],
      [84, 108, 55],
      [150, 98, 55],
      [108, 44, 48],
      [150, 44, 45],
    ],
  },
  {
    id: 2,
    months: [4, 5, 6],
    col: "#9ec8e6",
    dark: "#6b96b9",
    light: "#e6f2fb",
    bg: "#f4f9fe",
    fill: "#c7e2f6",
    circles: [
      [236, 96, 112],
      [196, 72, 65],
      [276, 74, 65],
      [252, 138, 68],
      [296, 108, 60],
      [208, 124, 55],
      [244, 100, 58],
      [220, 48, 48],
      [260, 50, 45],
    ],
  },
  {
    id: 3,
    months: [7, 8, 9],
    col: "#efbfab",
    dark: "#c8917a",
    light: "#fbeae2",
    bg: "#fff8f5",
    fill: "#f5d7ca",
    circles: [
      [122, 176, 108],
      [84, 150, 62],
      [166, 152, 62],
      [120, 220, 65],
      [170, 194, 55],
      [80, 194, 55],
      [138, 176, 55],
      [106, 130, 45],
      [146, 132, 45],
    ],
  },
  {
    id: 4,
    months: [10, 11, 12],
    col: "#c8b8e9",
    dark: "#9a88be",
    light: "#f0e9fb",
    bg: "#faf7ff",
    fill: "#dfd4f5",
    circles: [
      [236, 182, 106],
      [198, 154, 62],
      [274, 156, 62],
      [232, 224, 65],
      [278, 194, 55],
      [194, 196, 55],
      [248, 178, 55],
      [214, 128, 45],
      [252, 130, 45],
    ],
  },
];

const MONTH_NODES = [
  { m: 1, sid: 1, x: 102, y: 66 },
  { m: 2, sid: 1, x: 132, y: 52 },
  { m: 3, sid: 1, x: 158, y: 72 },
  { m: 4, sid: 2, x: 214, y: 70 },
  { m: 5, sid: 2, x: 252, y: 84 },
  { m: 6, sid: 2, x: 236, y: 122 },
  { m: 7, sid: 3, x: 92, y: 136 },
  { m: 8, sid: 3, x: 64, y: 160 },
  { m: 9, sid: 3, x: 120, y: 176 },
  { m: 10, sid: 4, x: 214, y: 168 },
  { m: 11, sid: 4, x: 252, y: 186 },
  { m: 12, sid: 4, x: 198, y: 208 },
] as const;

const toSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMemoryDate = (memory: MemoryRecord) =>
  toSafeDate(memory.date) ?? toSafeDate(memory.created_at);

const monthTitle = (month: number) => `Tháng ${String(month).padStart(2, "0")}`;

const getMonthSeason = (month: number) =>
  SEASONS.find((season) => season.months.includes(month)) ?? SEASONS[0];

const formatExactDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  if (!date) return "?";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const getFlowerConcept = (memory: MemoryRecord) => {
  return flowerConceptFromMemory(memory);
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getDelayClass = (seed: number) => `anim-d-${seed % 10}`;

const FLOWER_BADGE_BG_CLASSES = [
  "bg-rose-100/85",
  "bg-amber-100/85",
  "bg-red-100/85",
  "bg-pink-100/85",
  "bg-purple-100/85",
  "bg-orange-100/85",
  "bg-fuchsia-100/85",
  "bg-indigo-100/85",
  "bg-teal-100/85",
  "bg-yellow-100/85",
] as const;

function ConceptGlyph({
  concept,
  x,
  y,
  c1,
  c2,
  delayClass,
}: {
  concept: number;
  x: number;
  y: number;
  c1: string;
  c2: string;
  delayClass: string;
}) {
  const safe = normalizeFlowerConcept(concept);
  return (
    <g className={`flower-glyph flower-glyph-${safe} ${delayClass}`}>
      <g transform={`translate(${x + 8},${y - 8})`}>
        {safe === 1 ? (
          <>
            <ellipse cx="0" cy="-2" rx="2.6" ry="1.5" fill={c1} opacity="0.7" />
            <ellipse
              cx="1.6"
              cy="0.2"
              rx="1.7"
              ry="1.2"
              fill={c2}
              opacity="0.62"
            />
          </>
        ) : null}
        {safe === 2 ? (
          <>
            <circle cx="0" cy="0" r="1.8" fill={c2} opacity="0.75" />
            <line
              x1="0"
              y1="-3.3"
              x2="0"
              y2="-2.1"
              stroke={c1}
              strokeWidth="1"
            />
            <line x1="3.3" y1="0" x2="2.1" y2="0" stroke={c1} strokeWidth="1" />
            <line x1="0" y1="3.3" x2="0" y2="2.1" stroke={c1} strokeWidth="1" />
            <line
              x1="-3.3"
              y1="0"
              x2="-2.1"
              y2="0"
              stroke={c1}
              strokeWidth="1"
            />
          </>
        ) : null}
        {safe === 3 ? (
          <path
            d="M-2,-1.6 C-0.8,-3.2 1.7,-2.4 1.8,-0.7 C1.9,0.8 0.3,1.8 -1.1,1.4 C-2.6,1 -2.9,-0.3 -2,-1.6 Z"
            fill={c1}
            opacity="0.68"
          />
        ) : null}
        {safe === 4 ? (
          <>
            <path d="M0,-3 L1.9,0 L0,2.8 L-1.9,0 Z" fill={c2} opacity="0.7" />
            <circle cx="0" cy="0" r="0.9" fill={c1} opacity="0.85" />
          </>
        ) : null}
        {safe === 5 ? (
          <>
            <ellipse
              cx="0"
              cy="-2"
              rx="1.1"
              ry="2.1"
              fill={c1}
              opacity="0.68"
            />
            <ellipse
              cx="0"
              cy="1.2"
              rx="1.4"
              ry="1.1"
              fill={c2}
              opacity="0.62"
            />
          </>
        ) : null}
        {safe === 6 ? (
          <>
            <ellipse
              cx="-1.2"
              cy="0"
              rx="1.4"
              ry="2"
              fill={c1}
              opacity="0.65"
            />
            <ellipse cx="1.2" cy="0" rx="1.4" ry="2" fill={c2} opacity="0.65" />
          </>
        ) : null}
        {safe === 7 ? (
          <path
            d="M-2.5,1.2 C-1.5,-2.2 1.5,-2.2 2.5,1.2 C1.4,2.2 -1.4,2.2 -2.5,1.2 Z"
            fill={c1}
            opacity="0.72"
          />
        ) : null}
        {safe === 8 ? (
          <>
            <line x1="0" y1="-3" x2="0" y2="3" stroke={c1} strokeWidth="1" />
            <line x1="-3" y1="0" x2="3" y2="0" stroke={c1} strokeWidth="1" />
            <line
              x1="-2.2"
              y1="-2.2"
              x2="2.2"
              y2="2.2"
              stroke={c2}
              strokeWidth="0.8"
            />
            <line
              x1="-2.2"
              y1="2.2"
              x2="2.2"
              y2="-2.2"
              stroke={c2}
              strokeWidth="0.8"
            />
          </>
        ) : null}
        {safe === 9 ? (
          <>
            <path
              d="M0,-3.1 L2,-0.8 L0,2.2 L-2,-0.8 Z"
              fill={c1}
              opacity="0.7"
            />
            <circle cx="0" cy="-0.6" r="0.7" fill={c2} opacity="0.8" />
          </>
        ) : null}
        {safe === 10 ? (
          <>
            <circle cx="0" cy="0" r="2.3" fill={c1} opacity="0.3" />
            <circle cx="0" cy="0" r="1.2" fill={c2} opacity="0.78" />
          </>
        ) : null}
      </g>
    </g>
  );
}

function SeasonBlob({ season }: { season: SeasonDef }) {
  return (
    <g>
      <g filter={`url(#mb${season.id})`}>
        {season.circles.map(([cx, cy, r], idx) => (
          <ellipse
            key={`${season.id}-${idx}`}
            cx={cx}
            cy={cy}
            rx={r * 1.15}
            ry={r * 0.82}
            transform={`rotate(${idx * 42}, ${cx}, ${cy})`}
            fill={`url(#fg${season.id})`}
          />
        ))}
      </g>
      {season.circles.slice(2, 6).map(([cx, cy, r], idx) => (
        <circle
          key={`hl-${season.id}-${idx}`}
          cx={cx - r * 0.18}
          cy={cy - r * 0.22}
          r={r * 0.22}
          fill="rgba(255,255,255,.32)"
        />
      ))}
    </g>
  );
}

function YearTreeSvg({
  bucket,
  selectedMonth,
  onSelectMonth,
  registerExportSvg,
}: {
  bucket: YearBucket;
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
  registerExportSvg: (svg: SVGSVGElement | null) => void;
}) {
  return (
    <svg
      ref={registerExportSvg}
      width="100%"
      viewBox="0 0 360 420"
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full"
    >
      <style>{`
        .anim-d-0 { animation-delay: 0s; }
        .anim-d-1 { animation-delay: 0.06s; }
        .anim-d-2 { animation-delay: 0.12s; }
        .anim-d-3 { animation-delay: 0.18s; }
        .anim-d-4 { animation-delay: 0.24s; }
        .anim-d-5 { animation-delay: 0.3s; }
        .anim-d-6 { animation-delay: 0.36s; }
        .anim-d-7 { animation-delay: 0.42s; }
        .anim-d-8 { animation-delay: 0.48s; }
        .anim-d-9 { animation-delay: 0.54s; }
        .month-node-enter {
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: monthNodeEnter 0.46s cubic-bezier(.2,.84,.24,1) forwards;
        }
        @keyframes monthNodeEnter {
          0% { opacity: 0; transform: translateY(10px) scale(0.75); }
          70% { opacity: 1; transform: translateY(-2px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <defs>
        {SEASONS.map((season) => (
          <filter
            key={season.id}
            id={`mb${season.id}`}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
        ))}
        {SEASONS.map((season) => (
          <radialGradient id={`fg${season.id}`} key={`grad-${season.id}`}>
            <stop offset="0%" stopColor={season.fill} stopOpacity="1" />
            <stop offset="70%" stopColor={season.fill} stopOpacity="0.85" />
            <stop offset="100%" stopColor={season.light} stopOpacity="0.6" />
          </radialGradient>
        ))}
        <linearGradient id="treeTrunkGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5e3c" />
          <stop offset="35%" stopColor="#6b3a1f" />
          <stop offset="100%" stopColor="#4a2310" />
        </linearGradient>
        <radialGradient id="fgBridge" cx="48%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#c8e6c9" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#66bb6a" stopOpacity="0.72" />
        </radialGradient>
        <filter id="mb-bridge" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 14 -6"
          />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="180" cy="406" rx="78" ry="8" fill="rgba(0,0,0,.08)" />

      {/* Extended roots */}
      {[
        [180, 382, 112, 402],
        [180, 382, 248, 402],
        [180, 382, 146, 394],
        [180, 382, 214, 394],
        [180, 382, 166, 408],
        [180, 382, 194, 408],
      ].map(([x1, y1, x2, y2], idx) => (
        <line
          key={`root-${idx}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#5d3012"
          strokeWidth={idx < 2 ? 5 : idx < 4 ? 3.5 : 2.5}
          strokeLinecap="round"
          opacity="0.65"
        />
      ))}

      {/* Trunk */}
      <path
        d="M154,382 C148,348 150,306 160,266 C168,236 176,216 180,200 C185,216 193,236 200,266 C210,306 212,348 206,382 Z"
        fill="url(#treeTrunkGradient)"
        opacity="0.97"
      />
      <path
        d="M180,382 C178,348 181,312 184,272 C187,240 182,220 180,200"
        stroke="rgba(255,255,255,.1)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Branches */}
      <g
        stroke="rgba(90,58,31,.5)"
        strokeWidth="3.6"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M180,206 C160,178 136,158 116,146" />
        <path d="M180,206 C200,178 224,160 244,146" />
        <path d="M180,216 C162,198 136,186 106,184" />
        <path d="M180,216 C198,198 224,188 254,184" />
      </g>

      {[4, 3, 2, 1].map((id) => {
        const season = SEASONS.find((item) => item.id === id)!;
        return <SeasonBlob key={id} season={season} />;
      })}

      <g filter="url(#mb-bridge)">
        <circle cx="178" cy="138" r="68" fill="url(#fgBridge)" opacity="0.9" />
        <circle cx="176" cy="186" r="58" fill="url(#fgBridge)" opacity="0.86" />
        <circle cx="230" cy="164" r="46" fill="url(#fgBridge)" opacity="0.82" />
        <circle cx="126" cy="166" r="44" fill="url(#fgBridge)" opacity="0.82" />
      </g>

      {MONTH_NODES.map((monthNode, monthIndex) => {
        const season = SEASONS.find((item) => item.id === monthNode.sid)!;
        const count = bucket.months.get(monthNode.m)?.length ?? 0;
        const isSelected = selectedMonth === monthNode.m;
        return (
          <g
            key={monthNode.m}
            onClick={() => onSelectMonth(monthNode.m)}
            cursor="pointer"
            className={`month-node-enter anim-d-${monthIndex % 10}`}
          >
            <circle
              cx={monthNode.x}
              cy={monthNode.y}
              r={isSelected ? 16 : 13}
              fill={
                count > 0 ? (isSelected ? season.col : season.light) : "#eef2f1"
              }
              stroke={season.col}
              strokeWidth={isSelected ? 2.6 : 1.8}
            />
            <text
              x={monthNode.x}
              y={monthNode.y + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isSelected ? "#fff" : season.dark}
              fontSize="9"
              fontWeight="800"
              fontFamily="Georgia, serif"
            >
              {monthNode.m}
            </text>
            <text
              x={monthNode.x}
              y={monthNode.y + 15.5}
              textAnchor="middle"
              fill={season.dark}
              fontSize="6.3"
              fontWeight="700"
              opacity="0.78"
            >
              {count}
            </text>
          </g>
        );
      })}

      <text
        x="180"
        y="24"
        textAnchor="middle"
        fill="#6b8f7b"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.8"
      >
        VƯỜN KỈ NIỆM {bucket.year}
      </text>
    </svg>
  );
}

function MonthMemorySvg({
  year,
  month,
  memories,
  selectedMemoryId,
  onMemoryClick,
  registerExportSvg,
}: {
  year: number;
  month: number;
  memories: MemoryRecord[];
  selectedMemoryId: string | null;
  onMemoryClick: (memoryId: string) => void;
  registerExportSvg: (svg: SVGSVGElement | null) => void;
}) {
  const season = getMonthSeason(month);
  const cx = 150;
  const cy = 96;
  const circlesCount = memories.length;
  const circleSlots = Math.min(12, Math.max(6, circlesCount));

  return (
    <svg
      ref={registerExportSvg}
      width="100%"
      viewBox="0 0 300 230"
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full"
    >
      <style>{`
                .memory-enter {
                  opacity: 0;
                  transform-box: fill-box;
                  transform-origin: center;
                  animation: memoryEnter .7s cubic-bezier(.34, 1.56, .64, 1) forwards;
                }
                @keyframes memoryEnter {
                  0% { opacity: 0; transform: scale(0) rotate(-25deg); filter: blur(6px); }
                  60% { opacity: 1; transform: scale(1.15) rotate(5deg); filter: blur(0px); }
                  100% { opacity: 1; transform: scale(1) rotate(0deg); }
                }
        .flower-core, .flower-bloom, .flower-drift, .flower-glyph {
          transform-box: fill-box;
          transform-origin: center;
        }

        .anim-d-0 { animation-delay: 0s; }
        .anim-d-1 { animation-delay: 0.12s; }
        .anim-d-2 { animation-delay: 0.24s; }
        .anim-d-3 { animation-delay: 0.36s; }
        .anim-d-4 { animation-delay: 0.48s; }
        .anim-d-5 { animation-delay: 0.6s; }
        .anim-d-6 { animation-delay: 0.72s; }
        .anim-d-7 { animation-delay: 0.84s; }
        .anim-d-8 { animation-delay: 0.96s; }
        .anim-d-9 { animation-delay: 1.08s; }

        @keyframes coreSwayA {
          0%,100% { transform: rotate(-2.6deg) translateY(0px) scale(1); }
          50% { transform: rotate(2.6deg) translateY(-1.5px) scale(1.02); }
        }
        @keyframes coreSwayB {
          0%,100% { transform: rotate(1.2deg) translateX(0px) scale(0.98); }
          50% { transform: rotate(-1.8deg) translateX(0.8px) scale(1.03); }
        }
        @keyframes corePulse {
          0%,100% { transform: scale(0.96); }
          45% { transform: scale(1.07); }
        }
        @keyframes coreTwist {
          0%,100% { transform: rotate(0deg) scale(1); }
          35% { transform: rotate(3deg) scale(1.04); }
          70% { transform: rotate(-2deg) scale(0.98); }
        }

        @keyframes bloomHaloA {
          0%,100% { transform: scale(0.82); opacity: 0.1; }
          45% { transform: scale(1.14); opacity: 0.32; }
        }
        @keyframes bloomHaloB {
          0%,100% { transform: scale(0.9); opacity: 0.12; }
          50% { transform: scale(1.22); opacity: 0.28; }
        }
        @keyframes bloomHaloC {
          0%,100% { transform: scale(0.86); opacity: 0.08; }
          60% { transform: scale(1.18); opacity: 0.36; }
        }

        @keyframes driftRiseA {
          0% { transform: translate(0px, 1px) scale(0.75); opacity: 0; }
          20% { opacity: 0.45; }
          100% { transform: translate(-3px, -8px) scale(1.05); opacity: 0; }
        }
        @keyframes driftRiseB {
          0% { transform: translate(0px, 0px) scale(0.65); opacity: 0; }
          30% { opacity: 0.38; }
          100% { transform: translate(4px, -7px) scale(1.08); opacity: 0; }
        }
        @keyframes driftRiseC {
          0% { transform: translate(0px, 2px) scale(0.7); opacity: 0; }
          25% { opacity: 0.5; }
          100% { transform: translate(1px, -9px) scale(1.12); opacity: 0; }
        }
        @keyframes driftRiseD {
          0% { transform: translate(0px, 1px) scale(0.78); opacity: 0; }
          18% { opacity: 0.42; }
          100% { transform: translate(-5px, -6px) scale(1.04); opacity: 0; }
        }

        @keyframes glyphFloatA {
          0%,100% { transform: translateY(0px) rotate(0deg) scale(0.95); opacity: 0.45; }
          50% { transform: translateY(-2.6px) rotate(6deg) scale(1.08); opacity: 0.9; }
        }
        @keyframes glyphFloatB {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); opacity: 0.4; }
          50% { transform: translate(1.5px, -2px) rotate(-8deg); opacity: 0.86; }
        }
        @keyframes glyphFloatC {
          0%,100% { transform: translateY(0px) scale(0.88); opacity: 0.38; }
          50% { transform: translateY(-3px) scale(1.12); opacity: 0.92; }
        }

        .flower-core-1 { animation: coreSwayA 3.2s ease-in-out infinite; }
        .flower-core-2 { animation: coreSwayB 4.1s ease-in-out infinite; }
        .flower-core-3 { animation: corePulse 2.8s ease-in-out infinite; }
        .flower-core-4 { animation: coreTwist 5.2s ease-in-out infinite; }
        .flower-core-5 { animation: coreSwayA 3.6s cubic-bezier(.55,.08,.28,.98) infinite; }
        .flower-core-6 { animation: coreSwayB 2.9s cubic-bezier(.37,.07,.25,.97) infinite; }
        .flower-core-7 { animation: corePulse 2.35s ease-in-out infinite; }
        .flower-core-8 { animation: coreTwist 4.3s ease-in-out infinite; }
        .flower-core-9 { animation: coreSwayA 3.95s ease-in-out infinite; }
        .flower-core-10 { animation: coreSwayB 5.1s ease-in-out infinite; }

        .flower-bloom-1 { animation: bloomHaloA 2.9s ease-out infinite; }
        .flower-bloom-2 { animation: bloomHaloB 3.6s ease-out infinite; }
        .flower-bloom-3 { animation: bloomHaloC 2.4s ease-out infinite; }
        .flower-bloom-4 { animation: bloomHaloB 4.2s ease-out infinite; }
        .flower-bloom-5 { animation: bloomHaloA 3.1s ease-out infinite; }
        .flower-bloom-6 { animation: bloomHaloC 2.75s ease-out infinite; }
        .flower-bloom-7 { animation: bloomHaloA 2.05s ease-out infinite; }
        .flower-bloom-8 { animation: bloomHaloB 3.85s ease-out infinite; }
        .flower-bloom-9 { animation: bloomHaloC 3.15s ease-out infinite; }
        .flower-bloom-10 { animation: bloomHaloB 4.7s ease-out infinite; }

        .flower-drift-1 { animation: driftRiseA 3.3s linear infinite; }
        .flower-drift-2 { animation: driftRiseB 3.8s linear infinite; }
        .flower-drift-3 { animation: driftRiseC 2.9s linear infinite; }
        .flower-drift-4 { animation: driftRiseD 4.4s linear infinite; }
        .flower-drift-5 { animation: driftRiseB 3.2s linear infinite; }
        .flower-drift-6 { animation: driftRiseA 2.6s linear infinite; }
        .flower-drift-7 { animation: driftRiseC 2.3s linear infinite; }
        .flower-drift-8 { animation: driftRiseD 3.7s linear infinite; }
        .flower-drift-9 { animation: driftRiseA 3.45s linear infinite; }
        .flower-drift-10 { animation: driftRiseB 4.1s linear infinite; }

        .flower-glyph-1 { animation: glyphFloatA 2.7s ease-in-out infinite; }
        .flower-glyph-2 { animation: glyphFloatB 2.4s ease-in-out infinite; }
        .flower-glyph-3 { animation: glyphFloatA 3.1s ease-in-out infinite; }
        .flower-glyph-4 { animation: glyphFloatC 3.8s ease-in-out infinite; }
        .flower-glyph-5 { animation: glyphFloatA 2.3s ease-in-out infinite; }
        .flower-glyph-6 { animation: glyphFloatB 2.05s ease-in-out infinite; }
        .flower-glyph-7 { animation: glyphFloatC 2.6s ease-in-out infinite; }
        .flower-glyph-8 { animation: glyphFloatB 3.3s ease-in-out infinite; }
        .flower-glyph-9 { animation: glyphFloatA 2.95s ease-in-out infinite; }
        .flower-glyph-10 { animation: glyphFloatC 3.55s ease-in-out infinite; }
      `}</style>

      <defs>
        <filter id="mb-month" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
        </filter>
        <linearGradient id="monthTrunkGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5e3c" />
          <stop offset="40%" stopColor="#6b3a1f" />
          <stop offset="100%" stopColor="#4a2310" />
        </linearGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="300"
        height="230"
        fill={`linear-gradient(180deg,${season.bg} 0%,#fff 100%)`}
        opacity="0"
      />
      <ellipse cx="150" cy="224" rx="38" ry="4" fill="rgba(0,0,0,.07)" />
      {[
        [150, 222, 128, 226],
        [150, 222, 172, 226],
      ].map(([x1, y1, x2, y2], idx) => (
        <line
          key={`month-root-${idx}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#5d3012"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.65"
        />
      ))}
      <path
        d="M140,224 C138,208 140,190 144,172 C148,155 150,145 150,138 L150,138 C150,145 152,155 156,172 C160,190 162,208 160,224 Z"
        fill="url(#monthTrunkGradient)"
        opacity="0.95"
      />

      <g filter="url(#mb-month)">
        {[
          [150, 95, 82],
          [124, 70, 52],
          [176, 68, 48],
          [190, 95, 42],
          [182, 120, 38],
          [120, 118, 40],
          [96, 96, 38],
          [150, 48, 35],
          [134, 49, 28],
          [166, 50, 28],
        ].map(([bx, by, br], idx) => (
          <circle
            key={`blob-${idx}`}
            cx={bx}
            cy={by}
            r={br}
            fill={season.fill}
          />
        ))}
      </g>

      {memories.map((memory, index) => {
        const ring = Math.floor(index / circleSlots);
        const slot = index % circleSlots;
        const angle =
          (slot * 2 * Math.PI) / circleSlots -
          Math.PI / 2 +
          (ring * Math.PI) / circleSlots;
        const radius = 65 + ring * 45;
        const fx = cx + Math.cos(angle) * radius;
        const fy = cy + Math.sin(angle) * radius;
        const isSelected = selectedMemoryId === memory.id;
        const flowerId = getFlowerConcept(memory);
        const Flower =
          FLOWER_COMPONENTS[(flowerId - 1) % FLOWER_COMPONENTS.length];
        const [c1, c2] =
          FLOWER_PALETTES[(flowerId - 1) % FLOWER_PALETTES.length];
        const gid = `flower-${memory.id.replace(/[^a-zA-Z0-9-_]/g, "")}`;
        const concept = normalizeFlowerConcept(flowerId);
        const species = getFlowerSpeciesByConcept(flowerId);
        const seed = hashString(memory.id + memory.title + memory.date);
        const baseDelayClass = getDelayClass(index + concept + seed);
        const driftDelayA = getDelayClass(seed + 1);
        const driftDelayB = getDelayClass(seed + 4);
        const driftDelayC = getDelayClass(seed + 7);
        return (
          <motion.g
            key={memory.id}
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: (index % 12) * 0.05,
            }}
            onClick={() => onMemoryClick(memory.id)}
            cursor="pointer"
          >
            <circle
              cx={fx}
              cy={fy}
              r={isSelected ? 24 : 20}
              fill={
                isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)"
              }
              stroke={isSelected ? season.dark : "rgba(255,255,255,0.7)"}
              strokeWidth={isSelected ? 2.2 : 0.8}
            />

            <g
              className={`flower-bloom flower-bloom-${concept} ${baseDelayClass}`}
            >
              <circle
                cx={fx}
                cy={fy}
                r={isSelected ? 22 : 18}
                fill={c1}
                opacity={0.22}
              />
              <circle
                cx={fx}
                cy={fy}
                r={isSelected ? 28 : 24}
                fill={c2}
                opacity={0.12}
              />
            </g>

            <g
              className={`flower-core flower-core-${concept} ${baseDelayClass}`}
            >
              <Flower
                x={fx}
                y={fy}
                size={34}
                active={isSelected}
                gid={gid}
                c1={c1}
                c2={c2}
              />
            </g>

            <g>
              <ellipse
                cx={fx + 7}
                cy={fy - 2}
                rx={0.9}
                ry={1.6}
                fill={c1}
                opacity={0.5}
                className={`flower-drift flower-drift-${concept} ${driftDelayA}`}
              />
              <ellipse
                cx={fx - 6}
                cy={fy + 2}
                rx={0.8}
                ry={1.5}
                fill={c2}
                opacity={0.46}
                className={`flower-drift flower-drift-${concept} ${driftDelayB}`}
              />
              <ellipse
                cx={fx + 1}
                cy={fy - 7}
                rx={0.7}
                ry={1.3}
                fill={c1}
                opacity={0.44}
                className={`flower-drift flower-drift-${concept} ${driftDelayC}`}
              />
            </g>

            <ConceptGlyph
              concept={concept}
              x={fx - 2}
              y={fy + 2}
              c1={c1}
              c2={c2}
              delayClass={getDelayClass(seed + 2)}
            />
            <text
              x={fx}
              y={fy + 24}
              textAnchor="middle"
              fontSize="12"
              opacity="0.9"
            >
              {species.icon}
            </text>
          </motion.g>
        );
      })}

      <text
        x={150}
        y={20}
        textAnchor="middle"
        fill={season.dark}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.1"
      >
        {monthTitle(month)} / {year}
      </text>
    </svg>
  );
}

export default function FlowerTreeCanvas({
  memories,
  selectedMemoryId,
  onMemoryClick,
  onExportSvgChange,
  bottomBar,
}: FlowerTreeCanvasProps & { bottomBar?: React.ReactNode }) {
  const yearBuckets = useMemo<YearBucket[]>(() => {
    const yearMap = new Map<number, Map<number, MemoryRecord[]>>();

    memories.forEach((memory) => {
      const date = getMemoryDate(memory);
      if (!date) return;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (!yearMap.has(year)) {
        yearMap.set(year, new Map<number, MemoryRecord[]>());
      }
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(memory);
    });

    return Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, months]) => ({
        year,
        months,
      }));
  }, [memories]);

  const [activeYearIndex, setActiveYearIndex] = useState(0);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const prevYearIndex = useRef(activeYearIndex);

  useEffect(() => {
    if (activeYearIndex > prevYearIndex.current) {
      setDirection(1);
    } else if (activeYearIndex < prevYearIndex.current) {
      setDirection(-1);
    }
    prevYearIndex.current = activeYearIndex;
  }, [activeYearIndex]);

  const goPrevYear = () => {
    setActiveMonth(null);
    setActiveYearIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextYear = () => {
    setActiveMonth(null);
    setActiveYearIndex((idx) => Math.min(yearBuckets.length - 1, idx + 1));
  };

  const safeActiveYearIndex = Math.min(
    activeYearIndex,
    Math.max(0, yearBuckets.length - 1),
  );
  const activeYear = yearBuckets[safeActiveYearIndex] ?? null;
  const activeMonthMemories =
    activeYear && activeMonth ? (activeYear.months.get(activeMonth) ?? []) : [];

  if (!yearBuckets.length) {
    onExportSvgChange(null);
    return (
      <div className="mt-3 rounded-2xl border border-border bg-white/70 p-5 text-center text-sm text-text-secondary">
        Chưa có dữ liệu kỉ niệm để hiển thị cây theo năm.
      </div>
    );
  }

  return (
    <div
      className="mt-1 overflow-hidden rounded-2xl relative"
      style={{
        background:
          "linear-gradient(150deg, #fde8f0 0%, #fdf3e3 25%, #e8f5e8 55%, #e3eeff 80%, #f5e8ff 100%)",
      }}
    >
      <style>{`
        @keyframes petalDrift {
          0%   { transform: translateY(-40px) translateX(0) rotate(0deg);   opacity: 0; }
          5%   { opacity: 0.9; }
          85%  { opacity: 0.9; }
          100% { transform: translateY(110vh) translateX(var(--drift-x)) rotate(var(--drift-r)); opacity: 0; }
        }
        .petal { animation: petalDrift linear infinite; }
      `}</style>

      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-0 left-[10%] w-[45%] h-[35%] rounded-full blur-[60px] opacity-40"
          style={{
            background: "radial-gradient(circle, #f9a8d4, transparent)",
          }}
        />
        <div
          className="absolute top-[20%] right-0 w-[40%] h-[40%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #93c5fd, transparent)",
          }}
        />
        <div
          className="absolute bottom-[10%] left-0 w-[45%] h-[40%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #86efac, transparent)",
          }}
        />
        <div
          className="absolute bottom-0 right-[10%] w-[40%] h-[35%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #c4b5fd, transparent)",
          }}
        />
      </div>

      {/* Falling petals in front of the tree */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {Array.from({ length: 36 }).map((_, i) => {
          const emoji = ["🌸", "🌺", "🌼"][i % 3];
          const left = (i * 11) % 100;
          const size = 11 + (i % 7);
          const dur = 9 + (i % 8);
          const delay = (i % 12) * 0.65;
          const driftX = -55 + ((i * 17) % 110);
          const driftR = -320 + ((i * 47) % 640);

          return (
            <div
              key={`p-${i}`}
              className="petal absolute top-0 pointer-events-none"
              style={
                {
                  left: `${left}%`,
                  fontSize: `${size}px`,
                  animationDuration: `${dur}s`,
                  animationDelay: `${delay}s`,
                  "--drift-x": `${driftX}px`,
                  "--drift-r": `${driftR}deg`,
                } as React.CSSProperties
              }
            >
              {emoji}
            </div>
          );
        })}
      </div>

      {/* Year selector + nav — compact row, flush with edges */}
      <div className="relative z-10 flex items-center gap-1 px-2 pt-2 pb-1">
        <button
          type="button"
          onClick={goPrevYear}
          disabled={safeActiveYearIndex === 0}
          className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-white/60 border border-emerald-300/40 text-emerald-700 text-[10px] hover:bg-emerald-500 hover:text-white disabled:opacity-20 transition-all shadow-sm"
        >
          ◀
        </button>

        <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1">
          {yearBuckets.map((bucket, idx) => {
            const isActive = idx === safeActiveYearIndex;
            return (
              <button
                key={bucket.year}
                type="button"
                onClick={() => {
                  setActiveYearIndex(idx);
                  setActiveMonth(null);
                }}
                className={`flex-shrink-0 rounded-full px-3 py-0.5 text-[10px] font-bold transition-all border ${
                  isActive
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                    : "bg-white/50 text-emerald-700 border-emerald-300/30 hover:bg-white/70"
                }`}
              >
                {bucket.year}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goNextYear}
          disabled={safeActiveYearIndex === yearBuckets.length - 1}
          className="h-6 w-6 flex-shrink-0 flex items-center justify-center rounded-full bg-white/60 border border-emerald-300/40 text-emerald-700 text-[10px] hover:bg-emerald-500 hover:text-white disabled:opacity-20 transition-all shadow-sm"
        >
          ▶
        </button>
      </div>

      <div
        className="rounded-3xl border border-white/40 bg-white/30 p-4 transition-all duration-700 shadow-xl backdrop-blur-sm"
        onTouchStart={(event) => {
          if (activeMonth) return; // lock swipe when in month view
          const touch = event.changedTouches[0];
          setTouchStartX(touch?.clientX ?? null);
          setTouchStartY(touch?.clientY ?? null);
        }}
        onTouchEnd={(event) => {
          if (activeMonth) return; // lock swipe when in month view
          if (touchStartX === null || touchStartY === null) return;
          const touch = event.changedTouches[0];
          const endX = touch?.clientX ?? touchStartX;
          const endY = touch?.clientY ?? touchStartY;
          const deltaX = endX - touchStartX;
          const deltaY = endY - touchStartY;
          setTouchStartX(null);
          setTouchStartY(null);
          // Only treat as horizontal swipe if X movement dominates
          if (Math.abs(deltaX) < 42) return;
          if (Math.abs(deltaY) > Math.abs(deltaX) * 0.7) return; // mostly vertical
          if (deltaX > 0) {
            goPrevYear();
          } else {
            goNextYear();
          }
        }}
      >
        <div className="relative min-h-[420px] z-10">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={
                activeYear?.year + (activeMonth ? `-${activeMonth}` : "-tree")
              }
              custom={direction}
              initial={{ x: direction * 80, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -direction * 80, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="w-full flex items-center justify-center"
            >
              {activeYear && activeMonth ? (
                <div className="w-full">
                  <div className="mb-4 flex items-center justify-between gap-2 px-2">
                    <button
                      type="button"
                      onClick={() => setActiveMonth(null)}
                      className="rounded-full border border-emerald-500/20 bg-white/60 px-4 py-1.5 text-xs font-bold text-emerald-700 backdrop-blur-md hover:bg-white/80 transition-all"
                    >
                      ← {activeYear.year}
                    </button>
                    <span className="rounded-full border border-emerald-500/10 bg-white/40 px-4 py-1.5 text-[12px] font-bold text-emerald-700">
                      {monthTitle(activeMonth)} • {activeMonthMemories.length}{" "}
                      HOA
                    </span>
                  </div>
                  <MonthMemorySvg
                    year={activeYear.year}
                    month={activeMonth}
                    memories={activeMonthMemories}
                    selectedMemoryId={selectedMemoryId}
                    onMemoryClick={onMemoryClick}
                    registerExportSvg={onExportSvgChange}
                  />

                  {activeMonthMemories.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3 pb-2">
                      {activeMonthMemories.map((m) => {
                        const flowerId = getFlowerConcept(m);
                        const badgeBg =
                          FLOWER_BADGE_BG_CLASSES[
                            (flowerId - 1) % FLOWER_BADGE_BG_CLASSES.length
                          ];
                        const species = getFlowerSpeciesByConcept(flowerId);
                        return (
                          <motion.button
                            key={m.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onMemoryClick(m.id)}
                            className="flex items-center gap-3 rounded-2xl border border-emerald-500/10 bg-white/50 p-3 text-left backdrop-blur-lg hover:bg-white/70 transition-all shadow-md"
                          >
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl shadow-sm ${badgeBg}`}
                            >
                              {species.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-black text-emerald-900 leading-tight">
                                {m.title}
                              </p>
                              <p className="text-[10px] font-medium text-emerald-700/60">
                                {formatExactDate(m)}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full py-4">
                  <YearTreeSvg
                    bucket={activeYear!}
                    selectedMonth={activeMonth}
                    onSelectMonth={setActiveMonth}
                    registerExportSvg={onExportSvgChange}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {activeYear && !activeMonth ? (
          <p className="text-center text-[10px] font-medium text-emerald-700/60 pb-1">
            Nhấn vào tháng để xem hoa kỉ niệm 🌸
          </p>
        ) : null}

        {/* Bottom Toolbar injected from outside */}
        {bottomBar && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/10 pt-3 pb-1 px-1">
            {bottomBar}
          </div>
        )}
      </div>
    </div>
  );
}
