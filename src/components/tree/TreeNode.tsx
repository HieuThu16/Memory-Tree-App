"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PositionedNode } from "./types";

const palette: Record<
  PositionedNode["type"],
  { fill: string; stroke: string }
> = {
  diary: { fill: "rgba(36, 31, 25, 0.9)", stroke: "#c8956c" },
  photo: { fill: "rgba(26, 34, 28, 0.9)", stroke: "#78b890" },
  video: { fill: "rgba(40, 26, 24, 0.9)", stroke: "#d9897a" },
  album: { fill: "rgba(38, 30, 18, 0.9)", stroke: "#f5c97a" },
};

export default function TreeNode({
  node,
  index,
  isSelected,
  onSelect,
}: {
  node: PositionedNode;
  index: number;
  isSelected?: boolean;
  onSelect?: (node: PositionedNode) => void;
}) {
  const reduceMotion = useReducedMotion();
  const colors = palette[node.type];
  const stroke = isSelected ? "#fff" : colors.stroke;
  const strokeWidth = isSelected ? 3 : 2;

  const handleSelect = () => {
    onSelect?.(node);
  };

  return (
    <motion.g
      initial={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      className="cursor-pointer focus:outline-none"
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
    >
      <circle
        cx={node.x}
        cy={node.y}
        r={node.hasChildren ? 26 : 20}
        fill={colors.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={node.x}
        cy={node.y}
        r={node.hasChildren ? 12 : 9}
        fill={stroke}
        opacity={isSelected ? 0.3 : 0.15}
      />
      {isSelected ? (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.hasChildren ? 32 : 26}
          fill="none"
          stroke="#fff"
          strokeWidth={1.5}
          opacity={0.4}
          filter="url(#leafGlow)"
        />
      ) : null}
      <text
        x={node.x}
        y={node.y - 34}
        textAnchor="middle"
        className="fill-foreground text-[11px] font-semibold"
      >
        {node.title}
      </text>
      <text
        x={node.x}
        y={node.y - 18}
        textAnchor="middle"
        className="fill-text-muted text-[9px]"
      >
        {node.date}
      </text>
    </motion.g>
  );
}
