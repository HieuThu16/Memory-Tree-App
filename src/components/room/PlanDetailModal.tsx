import { createPortal } from "react-dom";
import { useState } from "react";
import type { RoomPlanRecord } from "@/lib/types";
import {
  PLAN_BUCKETS,
  TAPE_PATTERN,
  formatDate,
  formatDateTime,
  monthLabel,
  iconFromTitle,
} from "./plansJournalConfig";
import type { PlanBucket } from "./plansJournalConfig";

type Props = {
  isClient: boolean;
  plan: RoomPlanRecord | null;
  isPending: boolean;
  editingTitle: string;
  editingDescription: string;
  editingBucket: PlanBucket;
  setEditingTitle: (value: string) => void;
  setEditingDescription: (value: string) => void;
  setEditingBucket: (value: PlanBucket) => void;
  onClose: () => void;
  onToggleCompleted: () => void;
  onSave: () => void;
  onDelete: () => void;
  getDisplayName: (userId: string | null) => string;
};

export default function PlanDetailModal({
  isClient,
  plan,
  isPending,
  editingTitle,
  editingDescription,
  editingBucket,
  setEditingTitle,
  setEditingDescription,
  setEditingBucket,
  onClose,
  onToggleCompleted,
  onSave,
  onDelete,
  getDisplayName,
}: Props) {
  const [pastelTheme] = useState(() => {
    const themes = [
      {
        paper: "linear-gradient(165deg, #ffe2ea 0%, #ffd6f5 45%, #ffd4da 100%)",
        line: "rgba(190, 70, 110, 0.13)",
        tape: "#ffc7d9",
      },
      {
        paper: "linear-gradient(165deg, #dff1ff 0%, #d8e8ff 48%, #e7e5ff 100%)",
        line: "rgba(74, 117, 190, 0.14)",
        tape: "#c7dbff",
      },
      {
        paper: "linear-gradient(165deg, #ffe6e6 0%, #ffd8de 50%, #ffd2f1 100%)",
        line: "rgba(196, 77, 77, 0.13)",
        tape: "#ffcdcf",
      },
    ] as const;
    return themes[Math.floor(Math.random() * themes.length)];
  });

  if (!plan || !isClient) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{
          zIndex: 2147483646,
          pointerEvents: "auto",
          background: "rgba(38, 26, 16, 0.62)",
          animation: "fadeIn .22s ease",
        }}
        onClick={onClose}
      />

      <div
        className="fixed left-1/2 top-1/2 w-[min(94vw,460px)]"
        style={{
          zIndex: 2147483647,
          pointerEvents: "auto",
          transform: "translate(-50%,-50%)",
          animation: "paperUnfold .32s cubic-bezier(.34,1.4,.64,1)",
        }}
      >
        <div
          className="relative rounded-lg border border-[#cdb292] p-5 shadow-[0_24px_52px_rgba(0,0,0,.34)]"
          style={{
            background: pastelTheme.paper,
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${pastelTheme.line} 27px, ${pastelTheme.line} 28px)`,
          }}
        >
          <div
            className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 rounded-sm opacity-95"
            style={{ background: TAPE_PATTERN(pastelTheme.tape) }}
          />

          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#704627]">
                Chi tiết dự định
              </p>
              <p className="text-sm font-bold text-[#2f180c] whitespace-normal break-words">
                {plan.title}
              </p>
            </div>
            <div className="flex-shrink-0 rounded-full border border-[#a58b72] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5c3c24]">
              {plan.is_completed ? "Đã xong" : "Đang làm"}
            </div>
          </div>

          <div className="mb-3 text-center text-3xl">
            {iconFromTitle(plan.title)}
          </div>

          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            className="input-field mb-2 !rounded-xl !border-[#bfa587] !bg-white !py-2.5 !text-sm text-[#2f180c]"
            disabled={isPending}
            aria-label="Tên dự định"
            placeholder="Tên dự định"
          />

          <select
            value={editingBucket}
            onChange={(e) => setEditingBucket(e.target.value as PlanBucket)}
            className="input-field mb-2 !rounded-xl !border-[#bfa587] !bg-white !py-2.5 !text-sm text-[#2f180c]"
            disabled={isPending}
            aria-label="Kỳ hạn dự định"
          >
            {PLAN_BUCKETS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.key}
              </option>
            ))}
          </select>

          <textarea
            value={editingDescription}
            onChange={(e) => setEditingDescription(e.target.value)}
            rows={4}
            className="input-field mb-3 resize-none !rounded-xl !border-[#bfa587] !bg-white !py-2.5 !text-sm text-[#2f180c]"
            disabled={isPending}
            aria-label="Mô tả dự định"
            placeholder="Mô tả dự định"
          />

          <div className="mb-4 rounded-xl border border-[#ccb79a] bg-white/95 p-2.5 text-[11px] text-[#5a391f]">
            <p>
              ✦ {formatDate(plan.created_at)} · {monthLabel(plan.created_at)}
            </p>
            <p>Thêm bởi {getDisplayName(plan.added_by)}</p>
            <p>Cập nhật {formatDateTime(plan.updated_at)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleCompleted}
              disabled={isPending}
              className="rounded-lg border border-[#bda183] bg-[#fffdfa] px-2 py-2.5 text-xs font-semibold text-[#5f3f28] disabled:opacity-60"
            >
              {plan.is_completed ? "Bỏ hoàn thành" : "Đánh dấu xong"}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="rounded-lg border border-[#bda183] bg-[#fffdfa] px-2 py-2.5 text-xs font-semibold text-[#5f3f28] disabled:opacity-60"
            >
              Lưu chỉnh sửa
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
            >
              Xóa
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#bda183] bg-white px-2 py-2.5 text-xs font-semibold text-[#5f3f28]"
            >
              Đóng lại
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
