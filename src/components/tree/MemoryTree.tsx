"use client";

import { hierarchy, tree } from "d3-hierarchy";
import { useMemo, useState } from "react";
import type { MemoryRecord } from "@/lib/types";
import TreeBranch from "./TreeBranch";
import TreeNode from "./TreeNode";
import TreeParticles from "./TreeParticles";
import type { MemoryNode, PositionedNode, TreeBranch as Branch } from "./types";

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const toSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMemoryDate = (memory: MemoryRecord) =>
  toSafeDate(memory.date) ?? toSafeDate(memory.created_at);

const formatShortDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  return date ? shortDateFormatter.format(date) : "Unknown";
};

const formatLongDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  return date ? longDateFormatter.format(date) : "Unknown";
};

const formatYear = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  return date ? String(date.getFullYear()) : "Unknown";
};

const compareMemories = (a?: MemoryRecord, b?: MemoryRecord) => {
  const aTime = a ? getMemoryDate(a)?.getTime() ?? 0 : 0;
  const bTime = b ? getMemoryDate(b)?.getTime() ?? 0 : 0;
  return aTime - bTime;
};

const buildTree = (memories: MemoryRecord[]): MemoryNode => {
  const root: MemoryNode = {
    id: "root",
    title: "Kỷ niệm",
    type: "album",
    date: "Tất cả",
    children: [],
  };

  if (!memories.length) {
    return root;
  }

  const nodesById = new Map<string, MemoryNode>();
  memories.forEach((memory) => {
    nodesById.set(memory.id, {
      id: memory.id,
      title: memory.title,
      type: memory.type,
      date: formatShortDate(memory),
      memory,
    });
  });

  const yearBuckets = new Map<string, MemoryNode>();

  const getYearNode = (memory: MemoryRecord) => {
    const year = formatYear(memory);
    if (!yearBuckets.has(year)) {
      yearBuckets.set(year, {
        id: `year-${year}`,
        title: year,
        type: "album",
        date: "Year",
        children: [],
      });
    }

    return yearBuckets.get(year)!;
  };

  memories.forEach((memory) => {
    const node = nodesById.get(memory.id)!;
    if (memory.parent_id && nodesById.has(memory.parent_id)) {
      const parent = nodesById.get(memory.parent_id)!;
      parent.children = parent.children ?? [];
      parent.children.push(node);
      return;
    }

    const yearNode = getYearNode(memory);
    yearNode.children?.push(node);
  });

  yearBuckets.forEach((bucket) => {
    if (bucket.children?.length) {
      bucket.children.sort((a, b) => compareMemories(a.memory, b.memory));
    }
  });

  const sortedYears = Array.from(yearBuckets.values()).sort((a, b) => {
    const aNum = Number(a.title);
    const bNum = Number(b.title);
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return a.title.localeCompare(b.title);
    }
    return aNum - bNum;
  });

  root.children = sortedYears;
  return root;
};

export default function MemoryTree({ memories }: { memories: MemoryRecord[] }) {
  const width = 980;
  const height = 620;
  const offsetX = 70;
  const offsetY = 90;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const treeData = useMemo(() => buildTree(memories), [memories]);

  const { nodes, branches, trunk } = useMemo(() => {
    const layout = tree<MemoryNode>()
      .size([width - offsetX * 2, height - offsetY * 2])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.6));

    const root = hierarchy(treeData);
    layout(root);

    const positioned: PositionedNode[] = root.descendants().map((node) => {
      const x = (node.x ?? 0) + offsetX;
      const y = height - ((node.y ?? 0) + offsetY);
      return {
        ...node.data,
        x,
        y,
        depth: node.depth,
        hasChildren: Boolean(node.children?.length),
      };
    });

    const nodeMap = new Map(positioned.map((node) => [node.id, node]));

    const mappedBranches: Branch[] = root.links().map((link) => {
      const source = nodeMap.get(link.source.data.id)!;
      const target = nodeMap.get(link.target.data.id)!;
      const midY = (source.y + target.y) / 2;
      const path = `M ${source.x},${source.y} C ${source.x},${midY} ${
        target.x
      },${midY} ${target.x},${target.y}`;
      return {
        id: `${source.id}-${target.id}`,
        path,
        depth: target.depth,
      };
    });

    return {
      nodes: positioned,
      branches: mappedBranches,
      trunk: positioned[0],
    };
  }, [height, offsetX, offsetY, treeData, width]);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return nodes.find((node) => node.id === selectedId) ?? null;
  }, [nodes, selectedId]);

  const selectedMemory = selectedNode?.memory ?? null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-text-muted">
          Memory Tree
        </p>
        <p className="text-[11px] font-medium text-text-secondary">
          {memories.length} kỷ niệm
        </p>
      </div>
      
      <div className="w-full overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-6 h-auto min-w-[760px] w-full drop-shadow-[0_0_15px_rgba(200,149,108,0.15)]"
          role="img"
          aria-label="Memory tree"
        >
          <defs>
            <linearGradient id="branchGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c8956c" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7a553a" stopOpacity="0.3" />
            </linearGradient>
            <filter id="leafGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="0 0 0 0 0.96  0 0 0 0 0.79  0 0 0 0 0.48  0 0 0 0.6 0"
              />
            </filter>
          </defs>

          <path
            d={`M ${trunk?.x ?? 0},${height - 10} L ${trunk?.x ?? 0},${trunk?.y ?? 0}`}
            stroke="url(#branchGradient)"
            strokeWidth={6}
            strokeLinecap="round"
          />

          <TreeParticles width={width} height={height} />

          <g>
            {branches.map((branch, index) => (
              <TreeBranch key={branch.id} branch={branch} index={index} />
            ))}
          </g>

          <g>
            {nodes.map((node, index) => (
              <TreeNode
                key={node.id}
                node={node}
                index={index}
                isSelected={selectedId === node.id}
                onSelect={(next) => {
                  setSelectedId((current) =>
                    current === next.id ? null : next.id
                  );
                }}
              />
            ))}
          </g>

          <g filter="url(#leafGlow)">
            <circle cx={(trunk?.x ?? 0) - 120} cy={height - 120} r={6} fill="#f5c97a" />
            <circle cx={(trunk?.x ?? 0) + 140} cy={height - 160} r={5} fill="#e8a968" />
            <circle cx={(trunk?.x ?? 0) - 40} cy={height - 200} r={4} fill="#ebd1a4" />
          </g>
        </svg>
      </div>

      <div className="glass-card mt-8 rounded-3xl p-6 shadow-[var(--shadow-float)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-accent">
              {selectedMemory ? "Kỷ niệm đang chọn" : "Chi tiết"}
            </p>
            <h3 className="mt-2 text-2xl text-foreground">
              {selectedMemory
                ? selectedMemory.title
                : "Chọn một nút trên cây"}
            </h3>
          </div>
          {selectedId ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="rounded-full border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary transition hover:border-accent hover:text-accent"
            >
              Bỏ chọn
            </button>
          ) : null}
        </div>

        {selectedMemory ? (
          <div className="mt-5 grid gap-4 text-sm text-text-secondary">
            <div className="flex gap-4">
              <p>
                <span className="font-semibold text-text-muted mr-2">Loại:</span>
                <span className="text-accent">{selectedMemory.type}</span>
              </p>
              <p>
                <span className="font-semibold text-text-muted mr-2">Ngày:</span>
                <span className="text-foreground">{formatLongDate(selectedMemory)}</span>
              </p>
            </div>
            <p className="rounded-2xl bg-surface-2 p-4 leading-relaxed border border-border/50">
              {selectedMemory.content || "Kỷ niệm chưa có nội dung văn bản."}
            </p>
          </div>
        ) : selectedNode ? (
          <div className="mt-4 text-sm text-text-secondary rounded-2xl bg-surface-2 p-4">
            <p>
              Nút này đại diện cho nhóm: <span className="font-bold text-foreground">{selectedNode.title}</span>.
              Bên trong chứa {selectedNode.children?.length ?? 0} kỷ niệm.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            Chạm vào một nút bất kỳ trên cây để xem chi tiết khoảnh khắc đã được lưu giữ.
          </p>
        )}
      </div>
    </div>
  );
}
