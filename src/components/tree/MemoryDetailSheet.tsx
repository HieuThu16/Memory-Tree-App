"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion, type DragControls } from "framer-motion";
import type { MemoryEditHistoryRecord, MemoryRecord } from "@/lib/types";
import {
  FLOWER_COMPONENTS,
  FLOWER_PALETTES,
  normalizeFlowerConcept,
} from "./flowers";
import { flowerConceptFromMemory } from "../memory/flowerConcept";
import MemoryEditHistoryList from "../memory/MemoryEditHistoryList";
import MemoryComments from "../memory/MemoryComments";
import MemoryMediaDisplay from "../memory/MemoryMediaDisplay";
import BackButton from "../ui/BackButton";

type Appearance = {
  initials: string;
  displayName: string;
};

const CONCEPT_DETAIL_THEME = [
  {
    header:
      "border-rose-200/70 bg-gradient-to-r from-rose-100/82 via-pink-100/66 to-white/80",
    body: "bg-gradient-to-b from-rose-100/28 via-white/54 to-pink-100/24",
    card: "border-rose-200/70 bg-gradient-to-br from-rose-100/42 via-white/80 to-pink-100/30",
  },
  {
    header:
      "border-amber-200/70 bg-gradient-to-r from-yellow-100/82 via-amber-100/66 to-white/80",
    body: "bg-gradient-to-b from-yellow-100/28 via-white/54 to-amber-100/24",
    card: "border-amber-200/70 bg-gradient-to-br from-yellow-100/42 via-white/80 to-amber-100/30",
  },
  {
    header:
      "border-red-200/70 bg-gradient-to-r from-rose-100/82 via-red-100/66 to-white/80",
    body: "bg-gradient-to-b from-red-100/28 via-white/54 to-rose-100/24",
    card: "border-red-200/70 bg-gradient-to-br from-red-100/42 via-white/80 to-rose-100/30",
  },
  {
    header:
      "border-pink-300/70 bg-gradient-to-r from-pink-100/82 via-fuchsia-100/66 to-white/80",
    body: "bg-gradient-to-b from-pink-100/28 via-white/54 to-fuchsia-100/24",
    card: "border-pink-300/70 bg-gradient-to-br from-pink-100/42 via-white/80 to-fuchsia-100/30",
  },
  {
    header:
      "border-purple-300/70 bg-gradient-to-r from-violet-100/82 via-purple-100/66 to-white/80",
    body: "bg-gradient-to-b from-violet-100/28 via-white/54 to-purple-100/24",
    card: "border-purple-300/70 bg-gradient-to-br from-violet-100/42 via-white/80 to-purple-100/30",
  },
  {
    header:
      "border-orange-300/70 bg-gradient-to-r from-amber-100/82 via-orange-100/66 to-white/80",
    body: "bg-gradient-to-b from-amber-100/28 via-white/54 to-orange-100/24",
    card: "border-orange-300/70 bg-gradient-to-br from-amber-100/42 via-white/80 to-orange-100/30",
  },
  {
    header:
      "border-rose-300/70 bg-gradient-to-r from-pink-100/82 via-rose-100/66 to-white/80",
    body: "bg-gradient-to-b from-pink-100/28 via-white/54 to-rose-100/24",
    card: "border-rose-300/70 bg-gradient-to-br from-pink-100/42 via-white/80 to-rose-100/30",
  },
  {
    header:
      "border-indigo-300/70 bg-gradient-to-r from-indigo-100/82 via-violet-100/66 to-white/80",
    body: "bg-gradient-to-b from-indigo-100/28 via-white/54 to-violet-100/24",
    card: "border-indigo-300/70 bg-gradient-to-br from-indigo-100/42 via-white/80 to-violet-100/30",
  },
  {
    header:
      "border-teal-300/70 bg-gradient-to-r from-teal-100/82 via-emerald-100/66 to-white/80",
    body: "bg-gradient-to-b from-teal-100/28 via-white/54 to-emerald-100/24",
    card: "border-teal-300/70 bg-gradient-to-br from-teal-100/42 via-white/80 to-emerald-100/30",
  },
  {
    header:
      "border-yellow-300/70 bg-gradient-to-r from-yellow-100/82 via-amber-100/66 to-white/80",
    body: "bg-gradient-to-b from-yellow-100/28 via-white/54 to-amber-100/24",
    card: "border-yellow-300/70 bg-gradient-to-br from-yellow-100/42 via-white/80 to-amber-100/30",
  },
] as const;

function ConceptFlowerIcon({
  concept,
  size = 18,
}: {
  concept: number;
  size?: number;
}) {
  const safeConcept = normalizeFlowerConcept(concept);
  const Flower = FLOWER_COMPONENTS[safeConcept - 1];
  const [c1, c2] = FLOWER_PALETTES[safeConcept - 1];
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <style>{`
        .detail-concept-core { transform-box: fill-box; transform-origin: center; animation: detailCore 3.2s ease-in-out infinite; }
        .detail-concept-halo { transform-box: fill-box; transform-origin: center; animation: detailHalo 2.6s ease-in-out infinite; }
        @keyframes detailCore {
          0%,100% { transform: rotate(-2deg) scale(0.97); }
          50% { transform: rotate(2deg) scale(1.05); }
        }
        @keyframes detailHalo {
          0%,100% { transform: scale(0.78); opacity: 0.14; }
          45% { transform: scale(1.2); opacity: 0.34; }
        }
      `}</style>
      <circle
        cx={14}
        cy={14}
        r={9.4}
        fill={c1}
        opacity="0.18"
        className="detail-concept-halo"
      />
      <circle
        cx={14}
        cy={14}
        r={11.2}
        fill={c2}
        opacity="0.1"
        className="detail-concept-halo"
      />
      <g className="detail-concept-core">
        <Flower
          x={14}
          y={14}
          size={20}
          active
          gid={`detail-concept-${safeConcept}-${size}`}
          c1={c1}
          c2={c2}
        />
      </g>
    </svg>
  );
}

type MemoryDetailSheetProps = {
  isOpen: boolean;
  selectedMemory: MemoryRecord | null;
  currentUserId?: string;
  isDeleting: boolean;
  detailPopupRef: React.RefObject<HTMLDivElement | null>;
  detailDragControls: DragControls;
  selectedAppearance: Appearance | null;
  selectedLocation: string | null;
  selectedWithWhom: string | null;
  selectedEventTime: string | null;
  formattedLongDate: string;
  formattedCreatedAt: string;
  isHistoryLoading: boolean;
  historyEntries: MemoryEditHistoryRecord[] | undefined;
  isHistoryModalOpen: boolean;
  setIsHistoryModalOpen: (value: boolean) => void;
  isCommentModalOpen: boolean;
  setIsCommentModalOpen: (value: boolean) => void;
  onClose: () => void;
  onEdit: (memory: MemoryRecord) => void;
  onDelete: (memoryId: string) => void;
};

export default function MemoryDetailSheet({
  isOpen,
  selectedMemory,
  currentUserId,
  isDeleting,
  detailPopupRef,
  detailDragControls,
  selectedAppearance,
  selectedLocation,
  selectedWithWhom,
  selectedEventTime,
  formattedLongDate,
  formattedCreatedAt,
  isHistoryLoading,
  historyEntries,
  isHistoryModalOpen,
  setIsHistoryModalOpen,
  isCommentModalOpen,
  setIsCommentModalOpen,
  onClose,
  onEdit,
  onDelete,
}: MemoryDetailSheetProps) {
  if (typeof document === "undefined") return null;

  const concept = selectedMemory ? flowerConceptFromMemory(selectedMemory) : 1;
  const theme = CONCEPT_DETAIL_THEME[normalizeFlowerConcept(concept) - 1];

  return createPortal(
    <AnimatePresence>
      {isOpen && selectedMemory ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[20000] flex items-start justify-center overflow-y-auto bg-black/45 px-2 pb-2 pt-20 backdrop-blur-sm sm:px-4 sm:pb-4 sm:pt-24"
          onClick={onClose}
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
                onClose();
              }
            }}
            className="glass-card relative mt-0 flex w-full max-h-[calc(100dvh-6rem)] max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl sm:max-h-[calc(100dvh-7.5rem)] sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
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

            <div
              className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${theme.header}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <BackButton onClick={onClose} />
                <ConceptFlowerIcon concept={concept} size={18} />
                <h3 className="truncate text-base font-semibold text-rose-900 sm:text-lg">
                  {selectedMemory.title}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(selectedMemory)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white/80 text-rose-500 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Sửa"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-fuchsia-200 bg-white/80 text-fuchsia-500 transition hover:border-fuchsia-400 hover:bg-fuchsia-50 hover:text-fuchsia-600"
                  title="Lịch sử sửa"
                >
                  🕘
                </button>
                <button
                  type="button"
                  onClick={() => setIsCommentModalOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white/80 text-emerald-500 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
                  title="Bình luận"
                >
                  💬
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(selectedMemory.id)}
                  disabled={isDeleting}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white/80 text-red-500 transition hover:border-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Xóa"
                >
                  🗑
                </button>
              </div>
            </div>

            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-4 ${theme.body}`}
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white/85 px-3 py-1 font-semibold text-rose-700 shadow-sm">
                  🗓 {formattedLongDate}
                </span>
                {selectedMemory.category && !selectedMemory.room_id ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                    ✿ {selectedMemory.category}
                  </span>
                ) : null}
                {selectedWithWhom ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 font-semibold text-fuchsia-700">
                    👥 {selectedWithWhom}
                  </span>
                ) : null}
                {selectedEventTime ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                    🕒 {selectedEventTime}
                  </span>
                ) : null}
                {selectedLocation ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-700 shadow-sm">
                    📍 {selectedLocation}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white/85 px-3 py-1 font-semibold text-rose-500 shadow-sm">
                  🕐 {formattedCreatedAt}
                </span>
              </div>

              {selectedAppearance ? (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/60 px-2.5 py-1 text-[11px] text-rose-700 shadow-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/75 text-[9px] font-bold text-rose-700">
                    {selectedAppearance.initials.slice(0, 2)}
                  </span>
                  <span className="font-semibold">
                    {selectedAppearance.displayName}
                  </span>
                </div>
              ) : null}

              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-rose-300/70 to-rose-200/30" />
                <ConceptFlowerIcon concept={concept} size={14} />
                <span className="text-[10px] font-bold tracking-[0.2em] text-rose-500">
                  HÌNH ẢNH
                </span>
                <ConceptFlowerIcon concept={concept} size={14} />
                <div className="h-px flex-1 bg-gradient-to-r from-rose-200/30 via-rose-300/70 to-transparent" />
              </div>

              <div className={`rounded-2xl border p-3 shadow-sm ${theme.card}`}>
                <MemoryMediaDisplay media={selectedMemory.media || []} />
              </div>

              <div
                className={`mt-4 rounded-2xl border p-4 text-sm leading-relaxed text-rose-900 shadow-sm ${theme.card}`}
              >
                {selectedMemory.content ? (
                  <p className="m-0 italic leading-7 text-rose-900/90">
                    {selectedMemory.content}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400">
                    <ConceptFlowerIcon concept={concept} size={14} />
                    <span className="italic">Chưa có nội dung</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-sm">
                  💬
                </div>
                <span className="text-[11px] font-bold tracking-[0.2em] text-rose-600">
                  BÌNH LUẬN
                </span>
              </div>

              <div
                className={`mt-2 rounded-2xl border p-3 shadow-sm ${theme.card}`}
              >
                {currentUserId && (
                  <MemoryComments
                    memoryId={selectedMemory.id}
                    roomId={selectedMemory.room_id}
                    currentUserId={currentUserId}
                    showComposer={false}
                    showList
                  />
                )}
              </div>
            </div>

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
                    onCommentSubmitted={() => setIsCommentModalOpen(false)}
                  />
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
