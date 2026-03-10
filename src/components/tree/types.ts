import type { MemoryRecord, MemoryType } from "@/lib/types";

export type MemoryNode = {
  id: string;
  title: string;
  type: MemoryType;
  date: string;
  children?: MemoryNode[];
  memory?: MemoryRecord;
};

export type PositionedNode = MemoryNode & {
  x: number;
  y: number;
  depth: number;
  hasChildren: boolean;
};

export type TreeBranch = {
  id: string;
  path: string;
  depth: number;
};
