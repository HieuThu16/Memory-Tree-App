"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useDragControls } from "framer-motion";
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
import FlowerTreeCanvas from "./FlowerTreeCanvas";
import MemoryDetailSheet from "./MemoryDetailSheet";

const longDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const createdAtFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour12: false,
});

const toSafeDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMemoryDate = (memory: MemoryRecord) =>
  toSafeDate(memory.date) ?? toSafeDate(memory.created_at);

const formatLongDate = (memory: MemoryRecord) => {
  const date = getMemoryDate(memory);
  if (!date) return "?";
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${day} thg ${month}, ${year}`;
};

const formatCreatedAt = (memory: MemoryRecord) => {
  const date = toSafeDate(memory.created_at);
  if (!date) return "?";
  
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  
  return `${hour}:${minute} ${day}/${month}/${year}`;
};

const formatEventTime = (value?: string | null) => {
  if (!value) return null;
  return value.slice(0, 5);
};

export default function MemoryTree({
  memories,
  participants = [],
  participantsByUserId,
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

  const memoriesById = useMemo(
    () => new Map(memories.map((memory) => [memory.id, memory] as const)),
    [memories],
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

  const selectedMemory = selectedId
    ? (memoriesById.get(selectedId) ?? null)
    : null;
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
    const viewBox = svgRef.current.viewBox.baseVal;
    const exportWidth = Math.round(
      viewBox?.width || svgRef.current.clientWidth || 360,
    );
    const exportHeight = Math.round(
      viewBox?.height || svgRef.current.clientHeight || 292,
    );

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = exportWidth * 2;
      canvas.height = exportHeight * 2;
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
        @keyframes sakuraFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sakuraFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .sakura-float {
          animation: sakuraFloat 3.8s ease-in-out infinite;
        }
      `}</style>
      <div className={hideTree ? "hidden" : "w-full"}>
    
        <FlowerTreeCanvas
          memories={memories}
          selectedMemoryId={selectedId}
          onMemoryClick={(memoryId) => {
            setSelectedId(memoryId);
            setIsDetailOpen(true);
          }}
          onExportSvgChange={(svg) => {
            svgRef.current = svg;
          }}
        />
      </div>

      <MemoryDetailSheet
        isOpen={isDetailOpen}
        selectedMemory={selectedMemory}
        currentUserId={currentUserId}
        isDeleting={isDeleting}
        detailPopupRef={detailPopupRef}
        detailDragControls={detailDragControls}
        selectedAppearance={selectedAppearance}
        selectedLocation={selectedLocation}
        selectedWithWhom={selectedWithWhom}
        selectedEventTime={selectedEventTime}
        formattedLongDate={
          selectedMemory ? formatLongDate(selectedMemory) : "?"
        }
        formattedCreatedAt={
          selectedMemory ? formatCreatedAt(selectedMemory) : "?"
        }
        isHistoryLoading={isHistoryLoading}
        historyEntries={historyEntries}
        isHistoryModalOpen={isHistoryModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        isCommentModalOpen={isCommentModalOpen}
        setIsCommentModalOpen={setIsCommentModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setIsCommentModalOpen(false);
          setIsDetailOpen(false);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

    </div>
  );
}
