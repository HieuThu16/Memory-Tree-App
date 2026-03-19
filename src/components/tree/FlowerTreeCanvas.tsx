"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MemoryRecord } from "@/lib/types";

type YearBucket = {
  year: number;
  months: Map<number, MemoryRecord[]>;
};

type FlowerTreeCanvasProps = {
  memories: MemoryRecord[];
  selectedMemoryId: string | null;
  onMemoryClick: (memoryId: string) => void;
  onExportSvgChange: (svg: SVGSVGElement | null) => void;
  startAtLatestYear?: boolean;
};

const YEAR_FLOWER_ICONS = [
  "/icon/nam/1.png",
  "/icon/nam/2.png",
  "/icon/nam/3.png",
  "/icon/nam/4.png",
] as const;

const YEAR_ICON_THEMES = [
  {
    bg: "#ffeef5",
    ring: "#d89ab3",
    text: "#a1607c",
    glow: "rgba(216, 154, 179, 0.45)",
  },
  {
    bg: "#fff1ea",
    ring: "#e2a17f",
    text: "#a76144",
    glow: "rgba(226, 161, 127, 0.45)",
  },
  {
    bg: "#fffbe8",
    ring: "#e2c56a",
    text: "#a7822d",
    glow: "rgba(226, 197, 106, 0.45)",
  },
  {
    bg: "#fff1f6",
    ring: "#d3a0b3",
    text: "#9a6b7e",
    glow: "rgba(211, 160, 179, 0.45)",
  },
] as const;

const MONTH_FLOWER_ICONS = [
  "/icon/thang/1.png",
  "/icon/thang/2.png",
  "/icon/thang/3.png",
  "/icon/thang/4.png",
  "/icon/thang/5.png",
  "/icon/thang/6.png",
] as const;

const MONTH_ICON_THEMES = [
  {
    bg: "#eef9ff",
    ring: "#9bb7d9",
    text: "#3e6a8f",
    badge: "bg-sky-100/80 border-sky-200/70",
  },
  {
    bg: "#fff7e8",
    ring: "#e7c48f",
    text: "#a4702e",
    badge: "bg-amber-100/80 border-amber-200/70",
  },
  {
    bg: "#fff1f5",
    ring: "#f2a2bc",
    text: "#a6506a",
    badge: "bg-rose-100/85 border-rose-200/70",
  },
  {
    bg: "#f3f6ff",
    ring: "#b1b9d8",
    text: "#5a6285",
    badge: "bg-slate-100/80 border-slate-200/70",
  },
  {
    bg: "#fff1f6",
    ring: "#d4a1b4",
    text: "#9a6b7e",
    badge: "bg-pink-100/80 border-pink-200/70",
  },
  {
    bg: "#fff8db",
    ring: "#f2cd6c",
    text: "#9b7423",
    badge: "bg-yellow-100/80 border-yellow-200/70",
  },
] as const;

const MONTH_TREE_ICONS = [
  "/icon/cay-thang/1.png",
  "/icon/cay-thang/2.png",
  "/icon/cay-thang/3.png",
  "/icon/cay-thang/4.png",
  "/icon/cay-thang/5.png",
] as const;

const getYearIconForMonth = (month: number) =>
  YEAR_FLOWER_ICONS[Math.floor((month - 1) / 3)] ?? YEAR_FLOWER_ICONS[0];

const getYearThemeForMonth = (month: number) =>
  YEAR_ICON_THEMES[Math.floor((month - 1) / 3)] ?? YEAR_ICON_THEMES[0];

const getMonthIconForMonth = (month: number) =>
  MONTH_FLOWER_ICONS[(month - 1) % MONTH_FLOWER_ICONS.length] ??
  MONTH_FLOWER_ICONS[0];

const getMonthTreeIconForMonth = (month: number) =>
  MONTH_TREE_ICONS[(month - 1) % MONTH_TREE_ICONS.length] ??
  MONTH_TREE_ICONS[0];

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

const formatExactDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  if (!date) return "?";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getMemoryIconSeed = (memory: MemoryRecord) =>
  `${memory.id}:${memory.title}:${memory.date ?? ""}`;

const getMonthIconIndex = (seed: string) =>
  MONTH_FLOWER_ICONS.length ? hashString(seed) % MONTH_FLOWER_ICONS.length : 0;

const getMonthIconForSeed = (seed: string) =>
  MONTH_FLOWER_ICONS[getMonthIconIndex(seed)] ?? MONTH_FLOWER_ICONS[0];

const getMonthThemeForMonth = (month: number) =>
  MONTH_ICON_THEMES[(month - 1) % MONTH_ICON_THEMES.length] ??
  MONTH_ICON_THEMES[0];

const FLOWER_FILTER = "saturate(1.65) contrast(1.25) brightness(0.95)";

const getDelayClass = (seed: number) => `anim-d-${seed % 10}`;

function YearTreeSvg({
  bucket,
  onSelectMonth,
  registerExportSvg,
}: {
  bucket: YearBucket;
  onSelectMonth: (month: number) => void;
  registerExportSvg: (svg: SVGSVGElement | null) => void;
}) {
  const spreadCenter = { x: 180, y: 150 };
  const spreadScale = 1.12;
  return (
    <svg
      ref={registerExportSvg}
      width="100%"
      viewBox="0 0 360 520"
      preserveAspectRatio="xMidYMid meet"
      className="block h-auto w-full"
    >
      <style>{`
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
        <clipPath id="treeClip">
          <rect x="0" y="0" width="360" height="520" rx="32" ry="32" />
        </clipPath>
      </defs>

      <image
        href="/new_tree.png"
        x="0"
        y="0"
        width="360"
        height="520"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#treeClip)"
      />

      {MONTH_NODES.map((monthNode, monthIndex) => {
        const count = bucket.months.get(monthNode.m)?.length ?? 0;
        const iconSrc = getYearIconForMonth(monthNode.m);
        const theme = getYearThemeForMonth(monthNode.m);
        const iconSize = 96;
        const countFill = count > 0 ? theme.text : "rgba(90,90,90,0.55)";
        const sx =
          spreadCenter.x + (monthNode.x - spreadCenter.x) * spreadScale;
        const sy =
          spreadCenter.y + (monthNode.y - spreadCenter.y) * spreadScale;
        const countY = sy + iconSize / 2 + 8;
        return (
          <g
            key={monthNode.m}
            onClick={() => onSelectMonth(monthNode.m)}
            cursor="pointer"
            className="month-node-enter"
            style={{ animationDelay: `${(monthIndex % 10) * 0.06}s` }}
          >
            <title>{monthTitle(monthNode.m)}</title>
            <image
              href={iconSrc}
              x={sx - iconSize / 2}
              y={sy - iconSize / 2}
              width={iconSize}
              height={iconSize}
              preserveAspectRatio="xMidYMid meet"
              style={{ filter: FLOWER_FILTER }}
            />
            <text
              x={sx}
              y={countY}
              textAnchor="middle"
              fill={countFill}
              fontSize="7"
              fontWeight="800"
              opacity="0.9"
            >
              {count}
            </text>
          </g>
        );
      })}

      <text
        x="180"
        y="30"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="14"
        fontWeight="800"
        letterSpacing="2"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="3"
        paintOrder="stroke"
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
  const monthTheme = getMonthThemeForMonth(month);
  const treeIconSrc = getMonthTreeIconForMonth(month);
  const cx = 180;
  const cy = 220;
  const circlesCount = memories.length;
  const circleSlots = Math.min(12, Math.max(6, circlesCount));
  const laidOutMemories = useMemo(
    () =>
      memories.map((memory, index) => {
        const ring = Math.floor(index / circleSlots);
        const slot = index % circleSlots;
        const angle =
          (slot * 2 * Math.PI) / circleSlots -
          Math.PI / 2 +
          (ring * Math.PI) / circleSlots;
        const radius = 120 + ring * 30;
        const fx = cx + Math.cos(angle) * radius;
        const fy = cy + Math.sin(angle) * radius;
        const iconSeed = getMemoryIconSeed(memory);
        const seed = hashString(iconSeed);

        return {
          memory,
          fx,
          fy,
          iconSrc: getMonthIconForSeed(iconSeed),
          iconSize: selectedMemoryId === memory.id ? 72 : 60,
          baseDelayClass: getDelayClass(index + seed),
          rotation: (seed % 12) - 6,
          animationDelay: `${(index % 12) * 0.05}s`,
        };
      }),
    [circleSlots, cx, cy, memories, selectedMemoryId],
  );

  return (
    <svg
      ref={registerExportSvg}
      width="100%"
      viewBox="0 0 360 520"
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
        .month-card-enter {
          opacity: 0;
          transform: translateY(12px) scale(0.96);
          animation: monthCardEnter .34s ease forwards;
        }
        @keyframes memoryEnter {
          0% { opacity: 0; transform: scale(0) rotate(-25deg); filter: blur(6px); }
          60% { opacity: 1; transform: scale(1.15) rotate(5deg); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes monthCardEnter {
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .month-icon {
          transform-box: fill-box;
          transform-origin: center;
          animation: iconFloat 4.4s ease-in-out infinite;
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

        @keyframes iconFloat {
          0%,100% { transform: translateY(0px) scale(0.98); }
          50% { transform: translateY(-2px) scale(1.03); }
        }
      `}</style>

      <defs></defs>

      <rect
        x="0"
        y="0"
        width="360"
        height="520"
        fill={`linear-gradient(180deg,${monthTheme.bg} 0%,#fff 100%)`}
        opacity="0"
      />
      <image
        href={treeIconSrc}
        x="-15"
        y="-20"
        width="390"
        height="560"
        preserveAspectRatio="xMidYMid meet"
      />

      {laidOutMemories.map(
        ({
          memory,
          fx,
          fy,
          iconSrc,
          iconSize,
          baseDelayClass,
          rotation,
          animationDelay,
        }) => (
          <g
            key={memory.id}
            onClick={() => onMemoryClick(memory.id)}
            cursor="pointer"
            className="memory-enter"
            style={{ animationDelay }}
          >
            <image
              href={iconSrc}
              x={fx - iconSize / 2}
              y={fy - iconSize / 2}
              width={iconSize}
              height={iconSize}
              preserveAspectRatio="xMidYMid meet"
              className={`month-icon ${baseDelayClass}`}
              transform={`rotate(${rotation} ${fx} ${fy})`}
              style={{ filter: FLOWER_FILTER }}
            />
          </g>
        ),
      )}

      <text
        x={150}
        y={20}
        textAnchor="middle"
        fill={monthTheme.text}
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
  startAtLatestYear = false,
}: FlowerTreeCanvasProps & {
  bottomBar?: React.ReactNode;
}) {
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

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activeYearIndex, setActiveYearIndex] = useState(() =>
    startAtLatestYear ? Math.max(0, yearBuckets.length - 1) : 0,
  );
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);

  const goPrevYear = () => {
    setDirection(-1);
    setActiveMonth(null);
    setActiveYearIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextYear = () => {
    setDirection(1);
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
  const activeMonthTheme = activeMonth
    ? getMonthThemeForMonth(activeMonth)
    : MONTH_ICON_THEMES[0];

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
      className="mt-1 mx-auto w-full max-w-[430px] overflow-hidden rounded-2xl relative"
      style={{
        background:
          "linear-gradient(150deg, #fff0f6 0%, #fff5ed 28%, #fff9e6 55%, #f5f0ff 80%, #fff1f7 100%)",
      }}
    >
      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-0 left-[10%] w-[45%] h-[35%] rounded-full blur-[60px] opacity-40"
          style={{
            background: "radial-gradient(circle, #f3b0c8, transparent)",
          }}
        />
        <div
          className="absolute top-[20%] right-0 w-[40%] h-[40%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #f7c09b, transparent)",
          }}
        />
        <div
          className="absolute bottom-[10%] left-0 w-[45%] h-[40%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #f5e29b, transparent)",
          }}
        />
        <div
          className="absolute bottom-0 right-[10%] w-[40%] h-[35%] rounded-full blur-[60px] opacity-30"
          style={{
            background: "radial-gradient(circle, #e4c1d6, transparent)",
          }}
        />
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
                  setDirection(
                    idx === safeActiveYearIndex
                      ? 0
                      : idx > safeActiveYearIndex
                        ? 1
                        : -1,
                  );
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
          if (!touch) return;
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
          };
        }}
        onTouchEnd={(event) => {
          if (activeMonth) return; // lock swipe when in month view
          if (!touchStartRef.current) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          const { x: startX, y: startY } = touchStartRef.current;
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          touchStartRef.current = null;
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
        <div className="relative z-10">
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
                      {activeMonthMemories.map((m, index) => {
                        const badgeBg = activeMonthTheme.badge;
                        const iconSrc = getMonthIconForSeed(
                          getMemoryIconSeed(m),
                        );
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onMemoryClick(m.id)}
                            className="month-card-enter flex items-center gap-3 rounded-2xl border border-emerald-500/10 bg-white/50 p-3 text-left shadow-md backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-lg"
                            style={{
                              animationDelay: `${(index % 12) * 0.04}s`,
                            }}
                          >
                            <div
                              className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border text-xl shadow-sm ${badgeBg}`}
                            >
                              <img
                                src={iconSrc}
                                alt=""
                                aria-hidden="true"
                                className="h-12 w-12 object-contain"
                                style={{ filter: FLOWER_FILTER }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-black text-emerald-900 leading-tight">
                                {m.title}
                              </p>
                              <p className="text-[10px] font-medium text-emerald-700/60">
                                {formatExactDate(m)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full py-4">
                  <YearTreeSvg
                    bucket={activeYear!}
                    onSelectMonth={setActiveMonth}
                    registerExportSvg={onExportSvgChange}
                  />
                  <div className="mt-3 grid grid-cols-3 gap-3 px-2">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const month = idx + 1;
                      const count = activeYear?.months.get(month)?.length ?? 0;
                      const iconSrc = getMonthTreeIconForMonth(month);
                      const flowerSrc = getMonthIconForMonth(month);
                      return (
                        <button
                          key={`detail-month-${month}`}
                          type="button"
                          onClick={() => setActiveMonth(month)}
                          className={`flex flex-col items-center gap-1 rounded-xl border border-emerald-500/10 bg-white/60 px-2 py-2 text-[10px] font-semibold text-emerald-800/80 transition-all hover:bg-white/85 ${
                            count === 0 ? "opacity-60" : ""
                          }`}
                        >
                          <img
                            src={flowerSrc}
                            alt=""
                            aria-hidden="true"
                            className="h-16 w-16 object-contain"
                            style={{ filter: FLOWER_FILTER }}
                          />
                          <img
                            src={iconSrc}
                            alt=""
                            aria-hidden="true"
                            className="h-12 w-12 object-contain"
                          />
                          <span>{monthTitle(month)}</span>
                          <span className="text-[9px] font-medium text-emerald-700/60">
                            {count} hoa
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {activeYear && !activeMonth ? (
          <p className="text-center text-[10px] font-medium text-emerald-700/60 pb-1">
            Nhấn vào tháng để xem hoa kỉ niệm
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
