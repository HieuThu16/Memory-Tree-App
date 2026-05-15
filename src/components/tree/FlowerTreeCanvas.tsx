"use client";

import { memo, useMemo, useRef, useState } from "react";
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
  roomId: string;
};

import { useRouter } from "next/navigation";

const YEAR_FLOWER_ICONS = [
  "/icon/nam/1.png",
  "/icon/nam/2.png",
  "/icon/nam/3.png",
  "/icon/nam/4.png",
  "/icon/nam/1.png",
  "/icon/nam/2.png",
  "/icon/nam/3.png",
  "/icon/nam/4.png",
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
const MONTH_NODES = [
  { m: 1, x: 75, y: 110 },
  { m: 2, x: 130, y: 70 },
  { m: 3, x: 185, y: 55 },
  { m: 4, x: 250, y: 80 },
  { m: 5, x: 300, y: 130 },
  { m: 6, x: 310, y: 200 },
  { m: 7, x: 55, y: 180 },
  { m: 8, x: 85, y: 245 },
  { m: 9, x: 135, y: 215 },
  { m: 10, x: 230, y: 230 },
  { m: 11, x: 275, y: 255 },
  { m: 12, x: 190, y: 165 },
] as const;

const getYearIconForMonth = (month: number) =>
  YEAR_FLOWER_ICONS[month - 1] ?? YEAR_FLOWER_ICONS[0];

const getYearThemeForMonth = (month: number) =>
  YEAR_ICON_THEMES[Math.floor((month - 1) / 3)] ?? YEAR_ICON_THEMES[0];

const FLOWER_FILTER = "saturate(1.65) contrast(1.25) brightness(0.95)";

const monthTitle = (month: number) => `Tháng ${String(month).padStart(2, "0")}`;

function YearTreeSvg({
  bucket,
  onSelectMonth,
  registerExportSvg,
}: {
  bucket: YearBucket;
  onSelectMonth: (month: number) => void;
  registerExportSvg: (svg: SVGSVGElement | null) => void;
}) {
  // Using fixed positions now
  return (
    <svg
      ref={registerExportSvg}
      width="100%"
      viewBox="0 0 360 520"
      preserveAspectRatio="xMidYMax slice"
      className="block w-full h-full"
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
      </defs>

      <image
        href="/new_tree.png"
        x="0"
        y="0"
        width="360"
        height="520"
        preserveAspectRatio="xMidYMax slice"
      />

      {/* Pass 1: Render flower images (non-interactive, decorative) */}
      {MONTH_NODES.map((monthNode, monthIndex) => {
        const iconSrc = getYearIconForMonth(monthNode.m);
        const iconSize = 100;
        const sx = monthNode.x;
        const sy = monthNode.y;
        return (
          <image
            key={`img-${monthNode.m}`}
            href={iconSrc}
            x={sx - iconSize / 2}
            y={sy - iconSize / 2}
            width={iconSize}
            height={iconSize}
            preserveAspectRatio="xMidYMid meet"
            style={{ filter: FLOWER_FILTER, pointerEvents: "none", animationDelay: `${(monthIndex % 10) * 0.06}s` }}
            className="month-node-enter"
          />
        );
      })}

      {/* Pass 2: Render click targets + text (on top, sorted by Y desc so upper flowers are last = on top) */}
      {[...MONTH_NODES]
        .sort((a, b) => b.y - a.y)
        .map((monthNode) => {
          const count = bucket.months.get(monthNode.m)?.length ?? 0;
          const theme = getYearThemeForMonth(monthNode.m);
          const countFill = count > 0 ? theme.text : "rgba(90,90,90,0.55)";
          const sx = monthNode.x;
          const sy = monthNode.y;
          const countY = sy + 38;
          return (
            <g
              key={`click-${monthNode.m}`}
              onClick={() => onSelectMonth(monthNode.m)}
              cursor="pointer"
            >
              <title>{monthTitle(monthNode.m)}</title>
              {/* Invisible click target circle */}
              <circle cx={sx} cy={sy} r={40} fill="transparent" />
              <text
                x={sx}
                y={sy + 8}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="28"
                fontWeight="900"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="5"
                paintOrder="stroke fill"
                opacity="0.95"
                className="pointer-events-none"
              >
                {monthNode.m}
              </text>
              <text
                x={sx}
                y={countY + 8}
                textAnchor="middle"
                fill={countFill}
                fontSize="10"
                fontWeight="800"
                opacity="0.9"
                className="pointer-events-none"
              >
                {count > 0 ? `${count} kỉ niệm` : count}
              </text>
            </g>
          );
        })}


      <text
        x="180"
        y="35"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="16"
        fontWeight="900"
        letterSpacing="2"
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="4"
        paintOrder="stroke"
      >
        KỈ NIỆM {bucket.year}
      </text>
    </svg>
  );
}



function FlowerTreeCanvas({
  memories,
  selectedMemoryId,
  onMemoryClick,
  onExportSvgChange,
  bottomBar,
  startAtLatestYear = false,
  roomId,
  onAddMemory,
}: FlowerTreeCanvasProps & {
  bottomBar?: React.ReactNode;
  onAddMemory?: () => void;
}) {
  const router = useRouter();

  const yearBuckets = useMemo<YearBucket[]>(() => {
    const toSafeDate = (value?: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const getMemoryDate = (memory: MemoryRecord) =>
      toSafeDate(memory.date) ?? toSafeDate(memory.created_at);
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
  const [direction, setDirection] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const goPrevYear = () => {
    setDirection(-1);
    setActiveYearIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextYear = () => {
    setDirection(1);
    setActiveYearIndex((idx) => Math.min(yearBuckets.length - 1, idx + 1));
  };

  const safeActiveYearIndex = Math.min(
    activeYearIndex,
    Math.max(0, yearBuckets.length - 1),
  );
  const activeYear = yearBuckets[safeActiveYearIndex] ?? null;

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
      className="mx-auto w-full h-dvh overflow-hidden relative"
      style={{
        background: "linear-gradient(to bottom, #e0f2ff, #fff5f8)"
      }}
    >
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white"></div>
          <p className="mt-3 text-xs font-bold text-white drop-shadow-md animate-pulse">Đang mở...</p>
        </div>
      )}


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

        {onAddMemory && (
          <button
            type="button"
            onClick={onAddMemory}
            className="flex-shrink-0 rounded-full bg-emerald-500 text-white px-3 py-1 text-[10px] font-bold shadow-sm hover:bg-emerald-600 transition-all"
          >
            + Thêm
          </button>
        )}
      </div>

      <div
        className="absolute inset-0 z-0"
        onTouchStart={(event) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
          };
        }}
        onTouchEnd={(event) => {
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
        <div className="relative h-full w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeYear?.year ?? "tree"}
              custom={direction}
              initial={{ x: direction * 80, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -direction * 80, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-full w-full">
                <YearTreeSvg
                  bucket={activeYear!}
                  onSelectMonth={(month) => {
                    if (!activeYear) return;
                    setIsNavigating(true);
                    router.push(`/friends/${roomId}/timeline/${activeYear.year}/${month}`);
                  }}
                  registerExportSvg={onExportSvgChange}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default memo(FlowerTreeCanvas);
