"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import type {
  MemoryEditHistoryRecord,
  MemoryParticipant,
  MemoryRecord,
} from "@/lib/types";
import { getParticipantAppearance } from "@/lib/memberAppearance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { deleteMemory } from "@/lib/actions";
import MemoryEditHistoryList from "../memory/MemoryEditHistoryList";
import MemoryComments from "../memory/MemoryComments";
import TreeBranch from "./TreeBranch";
import TreeNode from "./TreeNode";
import TreeParticles from "./TreeParticles";
import MemoryMediaDisplay from "../memory/MemoryMediaDisplay";
import BackButton from "../ui/BackButton";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  TREE_NODE_SIZES,
  type MemoryNode,
  type PositionedNode,
  type TreeBranch as Branch,
} from "./types";

const CANVAS_WIDTH = 420;
const CENTER_X = CANVAS_WIDTH / 2;

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const createdAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
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
  return date ? shortDateFormatter.format(date) : "?";
};

const formatLongDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  return date ? longDateFormatter.format(date) : "?";
};

const formatCreatedAt = (memory: MemoryRecord) => {
  const date = toSafeDate(memory.created_at);
  return date ? createdAtFormatter.format(date) : "?";
};

const formatEventTime = (value?: string | null) => {
  if (!value) return null;
  return value.slice(0, 5);
};

const formatYear = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  return date ? String(date.getFullYear()) : "Unknown";
};

const PERF_ENABLED = process.env.NODE_ENV !== "production";
const DETAIL_POPUP_HORIZONTAL_NUDGE_CLASS = "sm:-translate-x-1";

const formatMonth = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  if (!date) return "Tháng ?";
  return `Tháng ${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const compareMemories = (a?: MemoryRecord, b?: MemoryRecord) => {
  const aTime = a ? (getMemoryDate(a)?.getTime() ?? 0) : 0;
  const bTime = b ? (getMemoryDate(b)?.getTime() ?? 0) : 0;
  return aTime - bTime;
};

const buildTree = (memories: MemoryRecord[]): MemoryNode => {
  const root: MemoryNode = {
    id: "root",
    title: "🌳",
    type: "album",
    date: "",
    children: [],
    kind: "root",
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
      kind: "memory",
    });
  });

  const yearBuckets = new Map<string, MemoryNode>();
  const monthBucketsByYear = new Map<string, Map<string, MemoryNode>>();

  const getYearNode = (memory: MemoryRecord) => {
    const year = formatYear(memory);
    if (!yearBuckets.has(year)) {
      yearBuckets.set(year, {
        id: `year-${year}`,
        title: year,
        type: "album",
        date: "",
        children: [],
        kind: "year",
      });
    }

    return yearBuckets.get(year)!;
  };

  const getMonthNode = (memory: MemoryRecord) => {
    const year = formatYear(memory);
    const month = formatMonth(memory);
    const yearNode = getYearNode(memory);

    if (!monthBucketsByYear.has(year)) {
      monthBucketsByYear.set(year, new Map<string, MemoryNode>());
    }

    const monthMap = monthBucketsByYear.get(year)!;
    if (!monthMap.has(month)) {
      const monthNode: MemoryNode = {
        id: `month-${year}-${month}`,
        title: month,
        type: "album",
        date: "",
        children: [],
        kind: "month",
      };
      monthMap.set(month, monthNode);
      yearNode.children?.push(monthNode);
    }

    return monthMap.get(month)!;
  };

  memories.forEach((memory) => {
    const node = nodesById.get(memory.id)!;
    if (memory.parent_id && nodesById.has(memory.parent_id)) {
      const parent = nodesById.get(memory.parent_id)!;
      parent.children = parent.children ?? [];
      parent.children.push(node);
      return;
    }

    const monthNode = getMonthNode(memory);
    monthNode.children?.push(node);
  });

  yearBuckets.forEach((bucket) => {
    if (!bucket.children?.length) {
      return;
    }

    bucket.children.forEach((monthNode) => {
      if (!monthNode.children?.length) return;
      monthNode.children.sort((a, b) => compareMemories(a.memory, b.memory));
    });

    bucket.children.sort((a, b) => a.title.localeCompare(b.title));
  });

  const sortedYears = Array.from(yearBuckets.values()).sort((a, b) => {
    const aNum = Number(a.title);
    const bNum = Number(b.title);
    if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
      return a.title.localeCompare(b.title); // Ascending
    }
    return aNum - bNum; // Ascending (Older year at top)
  });

  root.children = sortedYears;
  return root;
};

const computeTreeLayout = (treeData: MemoryNode) => {
  const positioned: PositionedNode[] = [];
  const mappedBranches: Branch[] = [];
  let cursorY = 100;

  const getAnchor = (node: PositionedNode, role: "source" | "target") => {
    const size = TREE_NODE_SIZES[node.kind ?? "memory"];

    if (
      node.kind === "root" ||
      node.kind === "year" ||
      node.kind === "month" ||
      node.side === "center"
    ) {
      return {
        x: node.x,
        y:
          role === "source"
            ? node.y + size.height / 2 - 4
            : node.y - size.height / 2 + 4,
      };
    }

    const sideMultiplier = node.side === "left" ? 1 : -1;
    const edgeX = node.x + sideMultiplier * (size.width / 2 - 12);

    return {
      x: edgeX,
      y: role === "source" ? node.y + size.height / 2 - 12 : node.y - 6,
    };
  };

  const trunkNode: PositionedNode = {
    ...treeData,
    x: CENTER_X,
    y: 40,
    depth: 0,
    hasChildren: Boolean(treeData.children?.length),
    side: "center",
    ownerId: null,
    kind: "root",
  };

  positioned.push(trunkNode);

  const addBranch = (source: PositionedNode, target: PositionedNode) => {
    const start = getAnchor(source, "source");
    const end = getAnchor(target, "target");
    const controlX1 = start.x + (end.x - start.x) * 0.24;
    const controlY1 = start.y + Math.max(24, (end.y - start.y) * 0.38);
    const controlX2 = end.x - (end.x - start.x) * 0.24;
    const controlY2 = end.y - Math.max(18, (end.y - start.y) * 0.28);

    mappedBranches.push({
      id: `${source.id}-${target.id}`,
      depth: target.depth,
      path: `M ${start.x},${start.y} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${end.x},${end.y}`,
    });
  };

  const placeChildren = (
    parent: PositionedNode,
    children: MemoryNode[] | undefined,
    depth: number,
    seed: number,
  ) => {
    if (!children?.length) return;

    children.forEach((child, index) => {
      const childKind = child.kind ?? "memory";
      const side =
        childKind === "month"
          ? "center"
          : parent.side === "center"
            ? (index + seed) % 2 === 0
              ? "left"
              : "right"
            : parent.side;
      const xOffset = Math.min(132, 104 + Math.max(0, depth - 1) * 18);
      cursorY += childKind === "month" ? 76 : depth === 3 ? 92 : 84;

      const childNode: PositionedNode = {
        ...child,
        x:
          side === "center"
            ? CENTER_X
            : CENTER_X + (side === "left" ? -xOffset : xOffset),
        y: cursorY,
        depth,
        hasChildren: Boolean(child.children?.length),
        side,
        ownerId: child.memory?.user_id ?? null,
        kind: childKind,
      };

      positioned.push(childNode);
      addBranch(parent, childNode);
      placeChildren(childNode, child.children, depth + 1, seed + index + 1);
      cursorY += 8;
    });
  };

  (treeData.children ?? []).forEach((group, index) => {
    const groupNode: PositionedNode = {
      ...group,
      x: CENTER_X,
      y: cursorY,
      depth: 1,
      hasChildren: Boolean(group.children?.length),
      side: "center",
      ownerId: null,
      kind: "year",
    };

    positioned.push(groupNode);
    placeChildren(groupNode, group.children, 2, index);
    cursorY += 74;
  });

  return {
    nodes: positioned,
    branches: mappedBranches,
    trunk: trunkNode,
    height: Math.max(500, cursorY + 96),
  };
};

export default function MemoryTree({
  memories,
  participants = [],
  participantsByUserId,
  isTwoPerson = false,
  currentUserId,
  hideTree,
}: {
  memories: MemoryRecord[];
  participants?: MemoryParticipant[];
  participantsByUserId?: Map<string, MemoryParticipant>;
  isTwoPerson?: boolean;
  currentUserId?: string;
  hideTree?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const detailPopupRef = useRef<HTMLDivElement | null>(null);
  const selectedId = useTreeStore((s) => s.selectedId);
  const setSelectedId = useTreeStore((s) => s.setSelectedId);
  const toggleSelectedId = useTreeStore((s) => s.toggleSelectedId);
  const setEditingMemory = useTreeStore((s) => s.setEditingMemory);
  const isDetailOpen = useTreeStore((s) => s.isDetailOpen);
  const setIsDetailOpen = useTreeStore((s) => s.setIsDetailOpen);
  const addToast = useUiStore((s) => s.addToast);
  const removeMemory = useMemoryStore((s) => s.removeMemory);
  const histories = useMemoryStore((s) => s.histories);
  const setHistory = useMemoryStore((s) => s.setHistory);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const detailDragControls = useDragControls();

  // Debug logging for location display investigation
  useEffect(() => {
    const memoriesWithLocation = memories.filter((m) => m.location);
    if (memoriesWithLocation.length > 0) {
      console.log(
        `[MemoryTree] ${memoriesWithLocation.length}/${memories.length} memories have location:`,
        memoriesWithLocation.map((m) => ({
          id: m.id,
          title: m.title,
          location: m.location,
          room_id: m.room_id,
        })),
      );
    }
    // Also check if any memories have location=null but showed location in DB
    const memoriesWithoutLocation = memories.filter((m) => !m.location);
    if (memoriesWithoutLocation.length > 0) {
      console.log(
        `[MemoryTree] ${memoriesWithoutLocation.length} memories WITHOUT location:`,
        memoriesWithoutLocation.map((m) => ({ id: m.id, title: m.title })),
      );
    }
  }, [memories]);

  const treeData = useMemo(() => buildTree(memories), [memories]);

  const { nodes, branches, trunk, height } = useMemo(
    () => computeTreeLayout(treeData),
    [treeData],
  );

  useEffect(() => {
    if (!PERF_ENABLED) return;

    const buildStartedAt = performance.now();
    const measuredTree = buildTree(memories);
    const buildElapsedMs = performance.now() - buildStartedAt;

    const layoutStartedAt = performance.now();
    const measuredLayout = computeTreeLayout(measuredTree);
    const layoutElapsedMs = performance.now() - layoutStartedAt;

    console.log(
      `[Perf][MemoryTree] buildTree=${buildElapsedMs.toFixed(2)}ms layoutTree=${layoutElapsedMs.toFixed(2)}ms (memories=${memories.length}, nodes=${measuredLayout.nodes.length}, branches=${measuredLayout.branches.length})`,
    );
  }, [memories]);

  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );
  const resolvedParticipantsByUserId = useMemo(
    () =>
      participantsByUserId ??
      new Map(
        participants.map(
          (participant) => [participant.userId, participant] as const,
        ),
      ),
    [participants, participantsByUserId],
  );

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return nodesById.get(selectedId) ?? null;
  }, [nodesById, selectedId]);

  const selectedMemory = selectedNode?.memory ?? null;
  const selectedLocation = selectedMemory?.location?.trim() || null;
  const selectedWithWhom = selectedMemory?.with_whom?.trim() || null;
  const selectedEventTime = formatEventTime(selectedMemory?.event_time);
  const selectedParticipant = selectedMemory
    ? resolvedParticipantsByUserId.get(selectedMemory.user_id)
    : undefined;
  const selectedAppearance = selectedParticipant
    ? getParticipantAppearance(selectedParticipant)
    : null;
  const historyEntries = selectedMemory
    ? histories[selectedMemory.id]
    : undefined;
  const isHistoryLoading =
    !!selectedMemory &&
    !Object.prototype.hasOwnProperty.call(histories, selectedMemory.id);

  useEffect(() => {
    if (!selectedMemory || historyEntries) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      const { data, error } = await createSupabaseBrowserClient()
        .from("memory_edit_history")
        .select("*")
        .eq("memory_id", selectedMemory.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (error) {
        addToast("Không tải được lịch sử chỉnh sửa.", "error");
        setHistory(selectedMemory.id, []);
        return;
      }

      setHistory(selectedMemory.id, (data ?? []) as MemoryEditHistoryRecord[]);
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [addToast, historyEntries, selectedMemory, setHistory]);

  useEffect(() => {
    if (!isDetailOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscrollBehavior;
    };
  }, [isDetailOpen]);

  useEffect(() => {
    if (!isDetailOpen || !selectedMemory || !detailPopupRef.current) {
      return;
    }

    const logCornerPositions = () => {
      const rect = detailPopupRef.current?.getBoundingClientRect();
      if (!rect) return;

      console.log("[MemoryDetailPopup] top-left:", {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
      });
      console.log("[MemoryDetailPopup] top-right:", {
        x: Math.round(rect.right),
        y: Math.round(rect.top),
      });
      console.log("[MemoryDetailPopup] size:", {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
      console.log("[MemoryDetailPopup] viewport:", {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const rafId = requestAnimationFrame(logCornerPositions);
    const settledTimer = window.setTimeout(logCornerPositions, 320);
    window.addEventListener("resize", logCornerPositions);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(settledTimer);
      window.removeEventListener("resize", logCornerPositions);
    };
  }, [isDetailOpen, selectedMemory]);

  const handleDownload = () => {
    if (!svgRef.current) return;

    const serialized = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>${serialized}`],
      {
        type: "image/svg+xml;charset=utf-8",
      },
    );
    const objectUrl = window.URL.createObjectURL(svgBlob);
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");

      if (!context) {
        const fallbackLink = document.createElement("a");
        fallbackLink.href = objectUrl;
        fallbackLink.download = `memory-tree-${new Date().toISOString().slice(0, 10)}.svg`;
        fallbackLink.click();
        window.URL.revokeObjectURL(objectUrl);
        addToast("Đã tải cây xuống 🌿", "success");
        return;
      }

      context.fillStyle = "#f6f0e7";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `memory-tree-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
      addToast("Đã lưu ảnh cây 🌸", "success");
    };

    image.onerror = () => {
      const fallbackLink = document.createElement("a");
      fallbackLink.href = objectUrl;
      fallbackLink.download = `memory-tree-${new Date().toISOString().slice(0, 10)}.svg`;
      fallbackLink.click();
      window.URL.revokeObjectURL(objectUrl);
      addToast("Đã tải cây xuống 🌿", "success");
    };

    image.src = objectUrl;
  };

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      const node = nodesById.get(nodeId);
      if (node?.memory && isTwoPerson) {
        // In 2-person rooms, show popup directly
        setSelectedId(nodeId);
        setIsDetailOpen(true);
      } else {
        // Toggle selection, show popup on click
        if (selectedId === nodeId) {
          setIsDetailOpen(true);
        } else {
          setIsDetailOpen(false);
          toggleSelectedId(nodeId);
        }
      }
    },
    [
      toggleSelectedId,
      setSelectedId,
      nodesById,
      isTwoPerson,
      selectedId,
      setIsDetailOpen,
    ],
  );

  const handleDelete = (memoryId: string) => {
    if (!confirm("Bạn có chắc muốn xóa kỉ niệm này?")) return;
    startDeleteTransition(async () => {
      const result = await deleteMemory(memoryId);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        removeMemory(memoryId);
        addToast("Đã xóa kỉ niệm 🍂", "success");
        setIsHistoryModalOpen(false);
        setIsCommentModalOpen(false);
        setIsDetailOpen(false);
        setSelectedId(null);
      }
    });
  };

  const handleEdit = (memory: MemoryRecord) => {
    setIsHistoryModalOpen(false);
    setIsCommentModalOpen(false);
    setIsDetailOpen(false);
    setEditingMemory(memory);
  };
  const memoriesWithLocation = useMemo(
    () =>
      memories.filter(
        (memory) =>
          typeof memory.location === "string" &&
          memory.location.trim().length > 0,
      ),
    [memories],
  );

  return (
    <div className="w-full">
      <style>{`
        @keyframes drawBranch {
          from { stroke-dashoffset: 300; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse-ring {
          0% { r: 18; opacity: 0.6; }
          100% { r: 30; opacity: 0; }
        }
        .mem-node { cursor: pointer; transition: transform 0.2s ease; }
        .mem-node:hover { transform: scale(1.04); }
        .mem-node:hover .node-title { fill: #3d2d1a; }
        .floating { animation: float 3s ease-in-out infinite; }
      `}</style>
      <div className={hideTree ? "hidden" : "w-full"}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {participants.length > 0 ? (
              <div className="flex -space-x-1.5">
                {participants.slice(0, 4).map((participant) => {
                  const appearance = getParticipantAppearance(participant);
                  return (
                    <div
                      key={participant.userId}
                      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[7px] font-bold"
                      style={{
                        backgroundColor: appearance.softColor,
                        color: appearance.strongColor,
                      }}
                      title={participant.displayName}
                    >
                      {appearance.initials.slice(0, 2)}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <span className="text-[10px] text-text-muted">
              {memories.length} 🌿
            </span>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full border border-border bg-white/75 p-2 text-text-secondary transition hover:border-accent hover:text-accent"
            title="Tải ảnh cây"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>

        {memoriesWithLocation.length > 0 ? (
          <div className="mt-2 rounded-xl border border-border bg-white/75 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              📍 Vị trí đã lưu ({memoriesWithLocation.length})
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {memoriesWithLocation.slice(0, 6).map((memory) => (
                <button
                  key={memory.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(memory.id);
                    setIsDetailOpen(true);
                  }}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] text-blue-500 transition hover:border-blue-300"
                  title={memory.title}
                >
                  📍 {memory.location?.trim()}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={`mt-2 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#fffdfa_0%,#f8f2ea_100%)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:rounded-[30px] sm:p-3 ${hideTree ? "hidden" : ""}`}
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.3}
            maxScale={3}
            centerOnInit
            wheel={{ step: 0.15, smoothStep: 0.01 }}
            doubleClick={{ disabled: true }}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_WIDTH} ${height}`}
                className="block h-auto w-full drop-shadow-[0_24px_42px_rgba(95,79,161,0.14)]"
                role="img"
                aria-label="Memory tree"
                preserveAspectRatio="xMidYMin meet"
              >
                <defs>
                  <linearGradient
                    id="branchGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#b6a1ff" stopOpacity="0.95" />
                    <stop
                      offset="100%"
                      stopColor="#7c5ce6"
                      stopOpacity="0.58"
                    />
                  </linearGradient>
                  <radialGradient id="treeSky" cx="50%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#fffefb" />
                    <stop offset="100%" stopColor="#f3ede4" />
                  </radialGradient>
                  <linearGradient id="rootGradient" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#7c5ce6" />
                    <stop offset="100%" stopColor="#a693ff" />
                  </linearGradient>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width={CANVAS_WIDTH}
                  height={height}
                  rx="42"
                  fill="url(#treeSky)"
                />

                {/* Decorative flowers at bottom */}
                <g opacity="0.4">
                  {/* Grass & flowers at base */}
                  <ellipse
                    cx={CENTER_X}
                    cy={height - 48}
                    rx="150"
                    ry="28"
                    fill="rgba(136, 216, 171, 0.25)"
                  />
                  {/* Small flowers scattered */}
                  <text
                    x={CENTER_X - 120}
                    y={height - 70}
                    fontSize="16"
                    opacity="0.6"
                  >
                    🌸
                  </text>
                  <text
                    x={CENTER_X + 90}
                    y={height - 80}
                    fontSize="14"
                    opacity="0.5"
                  >
                    🌼
                  </text>
                  <text
                    x={CENTER_X - 60}
                    y={height - 55}
                    fontSize="12"
                    opacity="0.5"
                  >
                    ✿
                  </text>
                  <text
                    x={CENTER_X + 40}
                    y={height - 62}
                    fontSize="10"
                    opacity="0.4"
                  >
                    🌷
                  </text>
                  <text
                    x={CENTER_X - 140}
                    y={height - 90}
                    fontSize="11"
                    opacity="0.35"
                  >
                    🍃
                  </text>
                  <text
                    x={CENTER_X + 130}
                    y={height - 95}
                    fontSize="11"
                    opacity="0.35"
                  >
                    🍃
                  </text>
                  {/* Top decoration */}
                  <text x={CENTER_X - 100} y={60} fontSize="12" opacity="0.3">
                    🦋
                  </text>
                  <text x={CENTER_X + 110} y={50} fontSize="10" opacity="0.25">
                    🌸
                  </text>
                </g>

                <line
                  x1={CENTER_X}
                  y1={(trunk?.y ?? 0) + TREE_NODE_SIZES.root.height / 2}
                  x2={CENTER_X}
                  y2={height - 86}
                  stroke="url(#branchGradient)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />

                <TreeParticles width={CANVAS_WIDTH} height={height} />

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
                      onSelect={handleSelectNode}
                      participant={
                        node.ownerId
                          ? resolvedParticipantsByUserId.get(node.ownerId)
                          : undefined
                      }
                    />
                  ))}
                </g>

                {/* Decorative scattered dots */}
                <g opacity={0.6}>
                  <circle
                    cx={CENTER_X - 138}
                    cy={height - 212}
                    r={5}
                    fill="#c9bafc"
                  />
                  <circle
                    cx={CENTER_X + 124}
                    cy={height - 286}
                    r={5}
                    fill="#88d8ab"
                  />
                  <circle
                    cx={CENTER_X - 48}
                    cy={height - 328}
                    r={4}
                    fill="#ef8a83"
                  />
                  <circle
                    cx={CENTER_X + 160}
                    cy={height - 180}
                    r={3.5}
                    fill="#f0c76b"
                  />
                  <circle
                    cx={CENTER_X - 155}
                    cy={height - 150}
                    r={3}
                    fill="#d772b3"
                  />
                </g>
              </svg>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>

      {/* Detail Popup - shown on click (immediately for 2-person rooms) */}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isDetailOpen && selectedMemory ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[20000] flex items-start justify-center overflow-y-auto bg-black/45 px-2 pb-2 pt-20 backdrop-blur-sm sm:px-4 sm:pb-4 sm:pt-24"
                  onClick={() => {
                    setIsHistoryModalOpen(false);
                    setIsCommentModalOpen(false);
                    setIsDetailOpen(false);
                  }}
                >
                  <motion.div
                    ref={detailPopupRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    drag="y"
                    dragControls={detailDragControls}
                    dragListener={false}
                    dragConstraints={{ top: -140, bottom: 240 }}
                    dragElastic={0.18}
                    onDragEnd={(_, info) => {
                      if (info.offset.y > 160 || info.velocity.y > 900) {
                        setIsHistoryModalOpen(false);
                        setIsCommentModalOpen(false);
                        setIsDetailOpen(false);
                      }
                    }}
                    className={`glass-card relative mt-0 flex w-full max-w-lg max-h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-2xl shadow-2xl sm:max-h-[calc(100dvh-7.5rem)] sm:rounded-3xl ${DETAIL_POPUP_HORIZONTAL_NUDGE_CLASS}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {/* Drag handle for flexible up/down movement */}
                    <div className="flex items-center justify-center pt-2 sm:pt-3">
                      <button
                        type="button"
                        aria-label="Kéo khung chi tiết"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          detailDragControls.start(event);
                        }}
                        className="h-5 w-20 cursor-grab touch-none rounded-full active:cursor-grabbing"
                      >
                        <span className="mx-auto block h-1.5 w-12 rounded-full bg-black/20" />
                      </button>
                    </div>

                    {/* Popup Header */}
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <BackButton
                          onClick={() => {
                            setIsHistoryModalOpen(false);
                            setIsCommentModalOpen(false);
                            setIsDetailOpen(false);
                          }}
                        />
                        <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                          {selectedMemory.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEdit(selectedMemory)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                          title="Sửa"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {/* Edit history */}
                        <button
                          type="button"
                          onClick={() => setIsHistoryModalOpen(true)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                          title="Lịch sử sửa"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 3v5h5" />
                            <path d="M3.05 13a9 9 0 1 0 .5-4" />
                            <polyline points="12 7 12 12 16 14" />
                          </svg>
                        </button>
                        {/* Comment */}
                        <button
                          type="button"
                          onClick={() => setIsCommentModalOpen(true)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition hover:border-accent hover:text-accent"
                          title="Bình luận"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedMemory.id)}
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition hover:border-rose hover:text-rose disabled:opacity-50"
                          title="Xóa"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Popup Body */}
                    <div
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4"
                      onPointerDownCapture={(e) => e.stopPropagation()}
                    >
                      {/* Meta info row */}
                      <div className="flex flex-wrap items-center gap-1 text-[10px] sm:gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-text-secondary">
                          🗓 {formatLongDate(selectedMemory)}
                        </span>
                        <span className="hidden items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-text-muted sm:inline-flex">
                          🕐 Tạo: {formatCreatedAt(selectedMemory)}
                        </span>
                        {selectedMemory.category && !selectedMemory.room_id ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-green">
                            ✿ {selectedMemory.category}
                          </span>
                        ) : null}
                        {selectedWithWhom ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-text-secondary">
                            👥 {selectedWithWhom}
                          </span>
                        ) : null}
                        {selectedEventTime ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-text-secondary">
                            🕒 {selectedEventTime}
                          </span>
                        ) : null}
                        {selectedLocation ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/80 px-2 py-1 font-medium text-blue-500">
                            📍 {selectedLocation}
                          </span>
                        ) : null}
                      </div>

                      {/* Author */}
                      {selectedAppearance ? (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-white/80 px-2 py-1 text-[10px] text-text-secondary sm:mt-2 sm:px-2.5 sm:text-[11px]">
                          <div
                            className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-bold"
                            style={{
                              backgroundColor: selectedAppearance.softColor,
                              color: selectedAppearance.strongColor,
                            }}
                          >
                            {selectedAppearance.initials.slice(0, 2)}
                          </div>
                          <span>{selectedAppearance.displayName}</span>
                        </div>
                      ) : null}

                      {/* Media Carousel */}
                      <MemoryMediaDisplay media={selectedMemory.media || []} />

                      {/* Content */}
                      <div className="mt-3 rounded-xl border border-border/50 bg-white/70 p-3 text-sm leading-relaxed text-text-secondary">
                        {selectedMemory.content || (
                          <span className="italic text-text-muted">
                            Chưa có nội dung 🌸
                          </span>
                        )}
                      </div>

                      {/* Comments list shown below memory content */}
                      {currentUserId && (
                        <MemoryComments
                          memoryId={selectedMemory.id}
                          roomId={selectedMemory.room_id}
                          currentUserId={currentUserId}
                          showComposer={false}
                          showList
                        />
                      )}

                      {selectedMemory.room_id ? (
                        <p className="mt-3 text-xs leading-relaxed text-text-muted">
                          Thành viên trong room này có thể sửa kỉ niệm. Mọi thay
                          đổi đều được lưu lại bên dưới.
                        </p>
                      ) : null}
                    </div>
                  </motion.div>

                  {isHistoryModalOpen ? (
                    <div
                      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-3 py-4 backdrop-blur-[2px]"
                      onClick={() => setIsHistoryModalOpen(false)}
                    >
                      <div
                        className="glass-card w-full max-w-lg rounded-2xl border border-border bg-white/95 p-3 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                          <p className="text-sm font-semibold text-foreground">
                            📝 Lịch sử chỉnh sửa
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsHistoryModalOpen(false)}
                            className="rounded-full border border-border px-2 py-1 text-xs text-text-secondary"
                          >
                            Đóng
                          </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pr-1">
                          <MemoryEditHistoryList
                            entries={historyEntries ?? []}
                            loading={isHistoryLoading}
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {isCommentModalOpen && currentUserId ? (
                    <div
                      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-3 py-4 backdrop-blur-[2px]"
                      onClick={() => setIsCommentModalOpen(false)}
                    >
                      <div
                        className="glass-card w-full max-w-md rounded-2xl border border-border bg-white/95 p-3 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
                          <p className="text-sm font-semibold text-foreground">
                            💬 Viết bình luận
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsCommentModalOpen(false)}
                            className="rounded-full border border-border px-2 py-1 text-xs text-text-secondary"
                          >
                            Đóng
                          </button>
                        </div>
                        <MemoryComments
                          memoryId={selectedMemory.id}
                          roomId={selectedMemory.room_id}
                          currentUserId={currentUserId}
                          showList={false}
                          showComposer
                          onCommentSubmitted={() =>
                            setIsCommentModalOpen(false)
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      {/* When a memory is selected but popup isn't open, show a small floating bar */}
      {selectedMemory && !isDetailOpen ? (
        <div className="sticky bottom-20 z-30 mt-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-white/92 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🌿</span>
            <span className="truncate text-xs font-semibold text-foreground">
              {selectedMemory.title}
            </span>
            {selectedLocation ? (
              <span className="hidden truncate rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium text-blue-500 sm:inline-flex">
                📍 {selectedLocation}
              </span>
            ) : null}
            {selectedEventTime ? (
              <span className="hidden rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium text-text-secondary sm:inline-flex">
                🕒 {selectedEventTime}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsDetailOpen(true)}
              className="rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white"
            >
              Xem ✿
            </button>
            <button
              type="button"
              onClick={() => handleEdit(selectedMemory)}
              className="rounded-full border border-border px-2 py-1.5 text-[10px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
              title="Sửa"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={() => handleDelete(selectedMemory.id)}
              disabled={isDeleting}
              className="rounded-full border border-border px-2 py-1.5 text-[10px] font-semibold text-text-secondary hover:border-rose hover:text-rose disabled:opacity-50"
              title="Xóa"
            >
              🗑
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
              }}
              className="rounded-full border border-border px-2 py-1.5 text-[10px] font-semibold text-text-muted"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
