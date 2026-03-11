import type { MemoryRecord, MemoryType } from "@/lib/types";

export type MemoryNode = {
  id: string;
  title: string;
  type: MemoryType;
  date: string;
  children?: MemoryNode[];
  memory?: MemoryRecord;
  kind?: "root" | "year" | "memory";
};

export type PositionedNode = MemoryNode & {
  x: number;
  y: number;
  depth: number;
  hasChildren: boolean;
  side?: "left" | "right" | "center";
  ownerId?: string | null;
};

export type TreeBranch = {
  id: string;
  path: string;
  depth: number;
};

export const TREE_NODE_SIZES = {
  root: { width: 36, height: 36 },
  year: { width: 86, height: 34 },
  memory: { width: 168, height: 92 },
} as const;

