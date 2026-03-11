"use client";

import { memo, type KeyboardEvent } from "react";
import type { MemoryParticipant } from "@/lib/types";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import { getMediaPublicUrl } from "@/lib/media";
import { TREE_NODE_SIZES, type PositionedNode } from "./types";

/* ─── 5 distinct color variants for the new organic shape ─── */
type ShapeVariant = "leaf" | "sakura" | "tulip" | "daisy" | "clover";

const VARIANTS: Record<
  ShapeVariant,
  { bg: string; stroke: string; accent: string; text: string }
> = {
  sakura: { bg: "#fff4f6", stroke: "#ef8a83", accent: "#f9b4b0", text: "#c0544e" },
  leaf: { bg: "#f2fff7", stroke: "#58b981", accent: "#8bd5ae", text: "#3a7d5a" },
  clover: { bg: "#f7f0ff", stroke: "#8e6df2", accent: "#c9bafc", text: "#5c3dbf" },
  tulip: { bg: "#fff3fb", stroke: "#d772b3", accent: "#e8a0cf", text: "#9c4080" },
  daisy: { bg: "#fffef4", stroke: "#e6c84e", accent: "#f0d875", text: "#8a7020" },
};

const VARIANT_ORDER: ShapeVariant[] = ["sakura", "leaf", "tulip", "daisy", "clover"];

const DECORATIVE_ICONS = ["🦋", "🌸", "🌼", "✿", "🌷", "🍃", "✨", "🐝", "🐞", "🌻", "🌺", "💮"];

/** Pick random decorations deterministically using the node id hash */
const getDecorations = (nodeId: string, count: number = 2) => {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = ((hash << 5) - hash + nodeId.charCodeAt(i)) | 0;
  }

  const rng = () => {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646; // [0, 1)
  };

  rng(); rng(); // mix it up

  const decors = [];
  // Use a mix of items
  const numDecors = 3 + Math.floor(rng() * 3); // 3-5 decorations per node
  for (let i = 0; i < numDecors; i++) {
    const icon = DECORATIVE_ICONS[Math.floor(rng() * DECORATIVE_ICONS.length)];
    const angle = rng() * Math.PI * 2;
    // W_NODE = 115, H_NODE = 88 => rx = 57.5, ry = 44
    const rx = 57.5;
    const ry = 44;
    // calculate ellipse radius at this angle
    const ellipseRadius = (rx * ry) / Math.sqrt(Math.pow(ry * Math.cos(angle), 2) + Math.pow(rx * Math.sin(angle), 2));
    // add some distance outside the shape
    const offset = 8 + rng() * 20; 
    const distance = ellipseRadius + offset;
    
    // Convert to cartesian coordinates
    const sx = Math.cos(angle) * distance;
    const sy = Math.sin(angle) * distance;
    
    const size = 10 + Math.floor(rng() * 8); // 10-18 size
    const delay = rng() * 2.5; // for float offset
    const rotate = rng() * 60 - 30; // -30 to 30 deg

    decors.push({ icon, x: sx, y: sy, size, delay, rotate });
  }

  return decors;
};

/** Pick a variant based on memory id hash for consistent variety */
const getVariant = (nodeId: string): ShapeVariant => {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = ((hash << 5) - hash + nodeId.charCodeAt(i)) | 0;
  }
  return VARIANT_ORDER[Math.abs(hash) % VARIANT_ORDER.length];
};

const buildTitleLines = (title: string, maxChars = 18) => {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["Kỉ niệm"];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || current.length === 0) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === 2) break;
  }

  if (current && lines.length < 2) lines.push(current);

  if (lines.length === 2 && words.join(" ").length > lines.join(" ").length) {
    lines[1] = `${lines[1].slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
  }

  return lines;
};

function TreeNodeView({
  node,
  index,
  isSelected,
  onSelect,
  participant,
}: {
  node: PositionedNode;
  index: number;
  isSelected?: boolean;
  onSelect?: (nodeId: string) => void;
  participant?: MemoryParticipant;
}) {
  const ownerAppearance = participant
    ? getParticipantAppearance(participant)
    : null;
  const titleLines = buildTitleLines(node.title);

  const contentSnippet = node.memory?.content
    ? node.memory.content.length > 20
      ? node.memory.content.slice(0, 20) + "…"
      : node.memory.content
    : null;

  const primaryMediaUrl = node.memory?.media?.[0]?.storage_path
    ? getMediaPublicUrl(node.memory.media[0].storage_path)
    : null;

  // Use the new standard node size
  const W_NODE = 115, H_NODE = 88;
  const rx = W_NODE / 2, ry = H_NODE / 2;

  const handleSelect = () => onSelect?.(node.id);
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect();
    }
  };

  /* ─── Root node ─── */
  if (node.kind === "root") {
    return (
      <g>
        <circle cx={node.x} cy={node.y - 48} r={18} fill="#7c5ce6" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        <circle cx={node.x} cy={node.y - 48} r={7} fill="rgba(255,255,255,0.5)" />
      </g>
    );
  }

  if (node.kind === "year") {
    return (
      <g style={{ animation: `fadeUp 0.4s ease forwards ${index * 0.1}s`, opacity: 0, animationFillMode: "forwards" }}>
        <rect x={node.x - 54} y={node.y - 18} width={108} height={36} rx={18}
          fill="#7c5ce6" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5}
        />
        <rect x={node.x - 54} y={node.y - 18} width={108} height={18} rx={18}
          fill="rgba(255,255,255,0.12)"
        />
        <text x={node.x} y={node.y + 6} textAnchor="middle"
          style={{ fill: "white", fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>
          {node.title}
        </text>
      </g>
    );
  }

  /* ─── Memory node ─── */
  const variantStr = getVariant(node.id);
  const v = VARIANTS[variantStr] || VARIANTS.sakura;
  
  // Single organic blob path centered at 0,0
  const shapePath = `M 0 ${-ry} 
    C ${rx * 0.9} ${-ry * 0.85}, ${rx * 1.05} ${-ry * 0.1}, ${rx * 0.6} ${ry * 0.5}
    Q 0 ${ry * 1.1}, ${-rx * 0.6} ${ry * 0.5}
    C ${-rx * 1.05} ${-ry * 0.1}, ${-rx * 0.9} ${-ry * 0.85}, 0 ${-ry} Z`;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={node.title}
      className="mem-node floating cursor-pointer focus:outline-none"
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      style={{
        animation: `fadeUp 0.5s ease forwards ${index * 0.12 + 0.3}s, float ${3 + index * 0.5}s ease-in-out ${index * 0.4}s infinite`,
        opacity: 0,
        animationFillMode: "forwards",
        transformOrigin: `${node.x}px ${node.y}px`,
      }}
    >
      {/* Pulse ring when selected */}
      {isSelected && (
        <circle cx={node.x} cy={node.y} r={18} fill="none"
          stroke={v.stroke} strokeWidth={2} opacity={0.4}
          style={{ animation: "pulse-ring 1.2s ease-out infinite" }}
        />
      )}

      {/* Group translated to node.x, node.y */}
      <g transform={`translate(${node.x} ${node.y})`}>
        <defs>
          <filter id={`shadow-${variantStr}-${node.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={v.stroke} floodOpacity={isSelected ? 0.35 : 0.15} />
          </filter>
          <clipPath id={`clip-node-${node.id}`}>
            <path d={shapePath} />
          </clipPath>
        </defs>

        <path
          d={shapePath}
          fill={primaryMediaUrl ? "#ddd" : v.bg}
          stroke={isSelected ? v.text : v.stroke}
          strokeWidth={isSelected ? 2.5 : 1.8}
          filter={`url(#shadow-${variantStr}-${node.id})`}
          style={{ transition: "all 0.25s ease" }}
        />
        
        {/* Media background overlay */}
        {primaryMediaUrl ? (
          <g clipPath={`url(#clip-node-${node.id})`}>
            <image
              href={primaryMediaUrl}
              x={-rx}
              y={-ry}
              width={W_NODE}
              height={H_NODE}
              preserveAspectRatio="xMidYMid slice"
            />
            {/* White frosted overlay to keep text readable */}
            <rect
              x={-rx}
              y={-ry}
              width={W_NODE}
              height={H_NODE}
              fill={isSelected ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.68)"}
              style={{ transition: "fill 0.25s ease" }}
            />
          </g>
        ) : null}

        {isSelected && (
          <path
            d={shapePath}
            fill="none"
            stroke={v.accent}
            strokeWidth={6}
            opacity={0.3}
            style={{ transform: "scale(1.06)", transformOrigin: `0px 0px` }}
          />
        )}

        {/* Vein */}
        <path
          d={`M -10 -22 Q 2 2, 10 24`}
          fill="none"
          stroke={v.stroke}
          strokeWidth={0.9}
          opacity={0.25}
        />
        {/* Decorative dot */}
        <circle cx={rx * 0.55} cy={-ry * 0.6} r={3} fill={v.accent} opacity={0.7} />

        {/* Stem from node to branch junction (local coords) */}
        <line
          x1={node.side === "left" ? 8 : -8}
          y1={H_NODE * 0.42}
          x2={node.side === "left" ? 24 : -24}
          y2={H_NODE * 0.52}
          stroke={v.stroke} strokeWidth={1.8} strokeLinecap="round" opacity={0.6}
        />

        {/* Decorative random icons around the node */}
        <g style={{ pointerEvents: "none", userSelect: "none" }}>
          {getDecorations(node.id).map((decor, i) => (
            <text
              key={`${node.id}-decor-${i}`}
              x={decor.x}
              y={decor.y}
              fontSize={decor.size}
              textAnchor="middle"
              alignmentBaseline="middle"
              opacity={0.8}
              transform={`rotate(${decor.rotate} ${decor.x} ${decor.y})`}
              style={{
                animation: `float 3.5s ease-in-out ${decor.delay}s infinite`,
              }}
            >
              {decor.icon}
            </text>
          ))}
        </g>

        {/* Title */}
        <text
          x={0}
          y={-10}
          textAnchor="middle"
          className="node-title fill-[#2f241d] font-bold"
          style={{ fontSize: 11, fontFamily: "Georgia, serif" }}
        >
          {titleLines.map((line, lineIndex) => (
            <tspan
              key={`${node.id}-${lineIndex}`}
              x={0}
              dy={lineIndex === 0 ? 0 : 13}
            >
              {line}
            </tspan>
          ))}
        </text>

        {/* Snippet */}
        {contentSnippet && (
          <text
            x={0}
            y={titleLines.length > 1 ? 16 : 9}
            textAnchor="middle"
            style={{ fill: "#7a6858", fontSize: 8, fontStyle: "italic", fontFamily: "Georgia, serif", pointerEvents: "none" }}
          >
            {contentSnippet}
          </text>
        )}

        {/* Date */}
        <text
          x={0}
          y={28}
          textAnchor="middle"
          style={{ fill: v.text, fontSize: 9, fontWeight: 600, fontFamily: "Georgia, serif", opacity: 0.8, pointerEvents: "none" }}
        >
          {node.date}
        </text>
      </g>
    </g>
  );
}

export default memo(
  TreeNodeView,
  (previous, next) =>
    previous.node === next.node &&
    previous.isSelected === next.isSelected &&
    previous.onSelect === next.onSelect &&
    previous.participant === next.participant,
);
