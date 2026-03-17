"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MemoryParticipant, RoomPlanRecord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/stores/uiStore";
import BackButton from "@/components/ui/BackButton";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

type Props = {
  roomId: string;
  currentUserId: string;
  initialPlans: RoomPlanRecord[];
  participantsByUserId: Map<string, MemoryParticipant>;
  onPlansCountChange?: (count: number) => void;
};

// Sprout icons for pending plans – each plan gets a different sprout based on its index
const SPROUT_ICONS = [
  "🌱",
  "🌿",
  "☘️",
  "🍀",
  "🌾",
  "🪴",
  "🎋",
  "🎍",
  "🌵",
  "🪻",
];
// Flower icons for completed plans – each plan blooms into a different flower
const FLOWER_ICONS = [
  "🌸",
  "🌺",
  "🌻",
  "🌼",
  "🌷",
  "🌹",
  "💐",
  "🪷",
  "🏵️",
  "💮",
];

// Simple hash to deterministically assign an icon based on plan title
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function PlanIcon({
  title,
  isCompleted,
}: {
  title: string;
  isCompleted: boolean;
}) {
  const idx = hashString(title);
  const icon = isCompleted
    ? FLOWER_ICONS[idx % FLOWER_ICONS.length]
    : SPROUT_ICONS[idx % SPROUT_ICONS.length];

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-300 ${
        isCompleted
          ? "bg-gradient-to-br from-pink-100 to-rose-100 shadow-[0_2px_8px_-2px_rgba(244,114,182,0.4)] scale-110"
          : "bg-gradient-to-br from-emerald-50 to-lime-50 shadow-[0_2px_8px_-2px_rgba(34,197,94,0.3)]"
      }`}
      title={isCompleted ? "Đã nở hoa 🌸" : "Đang nảy mầm 🌱"}
    >
      {icon}
    </span>
  );
}

type PlanFilter = "all" | "pending" | "completed";

export default function RoomPlansBoard({
  roomId,
  currentUserId,
  initialPlans,
  participantsByUserId,
  onPlansCountChange,
}: Props) {
  const addToast = useUiStore((state) => state.addToast);
  const [plans, setPlans] = useState<RoomPlanRecord[]>(initialPlans);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Dự định gần");
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState("Dự định gần");
  const [isAdding, setIsAdding] = useState(false);
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const parsePlanDescription = (desc: string | null) => {
    if (!desc) return { cat: "Dự định gần", text: "" };
    const match = desc.match(/^##CAT:(.*)##\n([\s\S]*)$/);
    if (match) return { cat: match[1], text: match[2] };
    return { cat: "Dự định gần", text: desc };
  };

  const formatPlanDescription = (cat: string, text: string) => {
    return `##CAT:${cat}##\n${text}`;
  };

  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  useEffect(() => {
    onPlansCountChange?.(plans.length);
  }, [onPlansCountChange, plans.length]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`room_plans:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_plans",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const inserted = payload.new as RoomPlanRecord;
          setPlans((current) => {
            const next = [
              inserted,
              ...current.filter((plan) => plan.id !== inserted.id),
            ];
            return next.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_plans",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as RoomPlanRecord;
          setPlans((current) =>
            current.map((plan) => (plan.id === updated.id ? updated : plan)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_plans",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setPlans((current) =>
            current.filter((plan) => plan.id !== deletedId),
          );
          setDetailPlanId((current) =>
            current === deletedId ? null : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === detailPlanId) ?? null,
    [detailPlanId, plans],
  );

  const filteredPlans = useMemo(() => {
    let result = plans;

    if (planFilter === "pending") {
      result = result.filter((plan) => !plan.is_completed);
    } else if (planFilter === "completed") {
      result = result.filter((plan) => plan.is_completed);
    }

    if (categoryFilter !== "all") {
      result = result.filter(
        (plan) => parsePlanDescription(plan.description).cat === categoryFilter,
      );
    }

    return result;
  }, [planFilter, categoryFilter, plans]);

  useEffect(() => {
    setEditingTitle(selectedPlan?.title ?? "");
    setEditingDescription(
      parsePlanDescription(selectedPlan?.description ?? "").text,
    );
    setEditingCategory(
      parsePlanDescription(selectedPlan?.description ?? "").cat,
    );
  }, [selectedPlan]);

  const getDisplayName = (userId: string | null) => {
    if (!userId) return "-";
    return participantsByUserId.get(userId)?.displayName ?? "Thành viên";
  };

  const handleCreatePlan = () => {
    const resolvedTitle = title.trim();
    if (!resolvedTitle) {
      addToast("Nhập tên dự định trước khi thêm.", "error");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_plans")
        .insert({
          room_id: roomId,
          added_by: currentUserId,
          title: resolvedTitle,
          description: formatPlanDescription(category, description.trim()),
        })
        .select(
          "id, room_id, added_by, title, description, is_completed, completed_by, completed_at, created_at, updated_at",
        )
        .single();

      if (error || !data) {
        addToast(error?.message ?? "Không thể thêm dự định.", "error");
        return;
      }

      setPlans((current) => {
        const next = [data as RoomPlanRecord, ...current];
        return next.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });

      setTitle("");
      setDescription("");
      setIsAdding(false);
      addToast("Đã thêm dự định mới.", "success");
    });
  };

  const handleToggleCompleted = (plan: RoomPlanRecord) => {
    startTransition(async () => {
      const isCompleted = !plan.is_completed;
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_plans")
        .update({
          is_completed: isCompleted,
          completed_by: isCompleted ? currentUserId : null,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq("room_id", roomId)
        .select(
          "id, room_id, added_by, title, description, is_completed, completed_by, completed_at, created_at, updated_at",
        )
        .single();

      if (error) {
        addToast(error.message ?? "Không thể cập nhật trạng thái.", "error");
        return;
      }

      if (data) {
        setPlans((current) =>
          current.map((item) =>
            item.id === data.id ? (data as RoomPlanRecord) : item,
          ),
        );
      }

      addToast(
        isCompleted ? "Đã đánh dấu hoàn thành." : "Đã bỏ đánh dấu.",
        "success",
      );
    });
  };

  const handleUpdatePlan = () => {
    if (!selectedPlan) {
      return;
    }

    const resolvedTitle = editingTitle.trim();
    if (!resolvedTitle) {
      addToast("Tên dự định không được để trống.", "error");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_plans")
        .update({
          title: resolvedTitle,
          description: formatPlanDescription(
            editingCategory,
            editingDescription.trim(),
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPlan.id)
        .eq("room_id", roomId)
        .select(
          "id, room_id, added_by, title, description, is_completed, completed_by, completed_at, created_at, updated_at",
        )
        .single();

      if (error) {
        addToast(error.message ?? "Không thể cập nhật dự định.", "error");
        return;
      }

      if (data) {
        setPlans((current) =>
          current.map((item) =>
            item.id === data.id ? (data as RoomPlanRecord) : item,
          ),
        );
      }

      addToast("Đã cập nhật dự định.", "success");
    });
  };

  const handleDeletePlan = (planId: string) => {
    if (!confirm("Xóa dự định này?")) {
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("room_plans")
        .delete()
        .eq("id", planId)
        .eq("room_id", roomId);

      if (error) {
        addToast(error.message ?? "Không thể xóa dự định.", "error");
        return;
      }

      setPlans((current) => current.filter((item) => item.id !== planId));
      setDetailPlanId((current) => (current === planId ? null : current));
      addToast("Đã xóa dự định.", "success");
    });
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white/80 p-3 sm:p-4">
      {isPending ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          Đang xử lý... Vui lòng chờ.
        </div>
      ) : null}

      {/* Header with stats and add button */}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold text-text-secondary">
          {filteredPlans.length} / {plans.length} dự định
        </p>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="btn-primary rounded-full px-3 py-1.5 text-xs font-bold"
        >
          + Thêm 🌱
        </button>
      </div>

      {/* Create Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-text-secondary">
                🌱 Gieo hạt dự định
              </p>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-full bg-slate-100 p-1.5 text-text-muted transition-colors hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 grid gap-3">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Dự định mới..."
                disabled={isPending}
                className="input-field !rounded-xl !py-2.5 text-sm"
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isPending}
                aria-label="Kỳ hạn dự định mới"
                className="input-field !rounded-xl !py-2.5 text-sm"
              >
                <option value="Dự định gần">Dự định gần</option>
                <option value="1-2 năm">1-2 năm</option>
                <option value="5-10 năm">5-10 năm</option>
              </select>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả chi tiết..."
                rows={3}
                disabled={isPending}
                className="input-field resize-none !rounded-xl !py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={handleCreatePlan}
                disabled={isPending}
                className="btn-primary mt-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {isPending ? "Đang gieo..." : "🌱 Gieo mầm dự định"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List container */}
      <div className="rounded-2xl border border-border bg-white/85 p-3">
        <div className="flex flex-col gap-2 border-b border-border pb-2 mb-2">
          <div className="inline-flex rounded-full border border-border bg-white p-1 self-start">
            <button
              type="button"
              onClick={() => setPlanFilter("all")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                planFilter === "all"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-white/70"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setPlanFilter("pending")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                planFilter === "pending"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-white/70"
              }`}
            >
              Chưa xong
            </button>
            <button
              type="button"
              onClick={() => setPlanFilter("completed")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                planFilter === "completed"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-white/70"
              }`}
            >
              Đã xong
            </button>
          </div>
          <div className="inline-flex flex-wrap gap-1.5 w-full">
            <span className="text-[10px] text-text-muted mr-1 my-auto">
              Loại:
            </span>
            {["all", "Dự định gần", "1-2 năm", "5-10 năm"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition border ${
                  categoryFilter === cat
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-white text-text-secondary hover:border-accent"
                }`}
              >
                {cat === "all" ? "Tất cả kỳ hạn" : cat}
              </button>
            ))}
          </div>
        </div>

        {filteredPlans.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-white/70 px-3 py-4 text-sm text-text-muted">
            {planFilter === "all"
              ? "Chưa có dự định nào. Hai bạn có thể thêm ngay phía trên."
              : "Không có dự định phù hợp bộ lọc hiện tại."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border border-border bg-white px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(plan)}
                    disabled={isPending}
                    className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white disabled:opacity-60"
                    title={
                      plan.is_completed
                        ? "Bỏ đánh dấu hoàn thành"
                        : "Đánh dấu hoàn thành"
                    }
                  >
                    <PlanIcon
                      title={plan.title}
                      isCompleted={plan.is_completed}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailPlanId(plan.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p
                      className={`truncate text-sm font-semibold ${
                        plan.is_completed
                          ? "text-text-muted line-through"
                          : "text-foreground"
                      }`}
                    >
                      {plan.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-text-secondary">
                      {parsePlanDescription(plan.description).text ||
                        "Chưa có mô tả"}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[9px] font-semibold">
                        {parsePlanDescription(plan.description).cat}
                      </span>
                      <p className="text-[11px] text-text-muted">
                        Thêm bởi {getDisplayName(plan.added_by)} ·{" "}
                        {formatDateTime(plan.created_at)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailPlanId(plan.id)}
                    className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-text-secondary"
                    title="Mở chi tiết"
                  >
                    ›
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-3 py-4 backdrop-blur-sm"
          onClick={() => setDetailPlanId(null)}
        >
          <div
            className="flex h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <BackButton onClick={() => setDetailPlanId(null)} />
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                  📝 Chi tiết dự định
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUpdatePlan}
                  disabled={isPending}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  {isPending ? "Đang sửa..." : "✏️ Sửa"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlan(selectedPlan.id)}
                  disabled={isPending}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
                >
                  🗑 Xóa
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Tên dự định
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  disabled={isPending}
                  className="input-field mt-2 !rounded-xl !py-2.5 text-sm"
                  aria-label="Tên dự định"
                />
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Kỳ hạn
                </label>
                <select
                  value={editingCategory}
                  onChange={(event) => setEditingCategory(event.target.value)}
                  disabled={isPending}
                  aria-label="Kỳ hạn dự định"
                  className="input-field mt-2 !rounded-xl !py-2.5 text-sm"
                >
                  <option value="Dự định gần">Dự định gần</option>
                  <option value="1-2 năm">1-2 năm</option>
                  <option value="5-10 năm">5-10 năm</option>
                </select>
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Mô tả
                </label>
                <textarea
                  value={editingDescription}
                  onChange={(event) =>
                    setEditingDescription(event.target.value)
                  }
                  rows={4}
                  disabled={isPending}
                  className="input-field mt-2 resize-none !rounded-xl !py-2.5 text-sm"
                  aria-label="Mô tả dự định"
                />
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3 text-xs text-text-secondary">
                <p>Người thêm: {getDisplayName(selectedPlan.added_by)}</p>
                <p>Thời gian thêm: {formatDateTime(selectedPlan.created_at)}</p>
                <p>
                  Trạng thái:{" "}
                  {selectedPlan.is_completed
                    ? "Đã hoàn thành"
                    : "Chưa hoàn thành"}
                </p>
                <p>
                  Người đánh dấu: {getDisplayName(selectedPlan.completed_by)}
                </p>
                <p>Khi đánh dấu: {formatDateTime(selectedPlan.completed_at)}</p>
              </div>

              <div className="flex gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => handleToggleCompleted(selectedPlan)}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-secondary"
                >
                  <PlanIcon
                    title={selectedPlan.title}
                    isCompleted={selectedPlan.is_completed}
                  />
                  <span>
                    {selectedPlan.is_completed
                      ? "Bỏ đánh dấu"
                      : "Đánh dấu hoàn thành"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border bg-white/95 px-3 py-2 sm:px-4">
              <button
                type="button"
                onClick={() => setDetailPlanId(null)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary"
              >
                ← Quay lại
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUpdatePlan}
                  disabled={isPending}
                  className="btn-primary rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  {isPending ? "Đang sửa..." : "✏️ Sửa"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlan(selectedPlan.id)}
                  disabled={isPending}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
                >
                  🗑 Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
