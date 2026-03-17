"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MemoryParticipant, RoomPlanRecord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/stores/uiStore";
import {
  PLAN_BUCKETS,
  parsePlanDescription,
  formatPlanDescription,
} from "./plansJournalConfig";
import type { PlanBucket } from "./plansJournalConfig";
import PlanNotesCarousel from "./PlanNotesCarousel";
import PlanDetailModal from "./PlanDetailModal";

type Props = {
  roomId: string;
  currentUserId: string;
  initialPlans: RoomPlanRecord[];
  participantsByUserId: Map<string, MemoryParticipant>;
  onPlansCountChange?: (count: number) => void;
};

export default function RoomPlansBoard({
  roomId,
  currentUserId,
  initialPlans,
  participantsByUserId,
  onPlansCountChange,
}: Props) {
  const addToast = useUiStore((state) => state.addToast);
  const [plans, setPlans] = useState<RoomPlanRecord[]>(initialPlans);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bucket, setBucket] = useState<PlanBucket>("Gần 1 năm");
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingBucket, setEditingBucket] = useState<PlanBucket>("Gần 1 năm");
  const [isClient, setIsClient] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
              ...current.filter((p) => p.id !== inserted.id),
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

  useEffect(() => {
    if (!selectedPlan) return;
    const parsed = parsePlanDescription(selectedPlan.description);
    setEditingTitle(selectedPlan.title);
    setEditingDescription(parsed.text);
    setEditingBucket(parsed.bucket);
  }, [selectedPlan]);

  const plansByBucket = useMemo(() => {
    const mapped = new Map<PlanBucket, RoomPlanRecord[]>();
    PLAN_BUCKETS.forEach((item) => mapped.set(item.key, []));

    plans.forEach((plan) => {
      const parsed = parsePlanDescription(plan.description);
      mapped.get(parsed.bucket)?.push(plan);
    });

    mapped.forEach((items, key) => {
      mapped.set(
        key,
        [...items].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      );
    });

    return mapped;
  }, [plans]);

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
          description: formatPlanDescription(bucket, description.trim()),
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
      setBucket("Gần 1 năm");
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
    if (!selectedPlan) return;

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
            editingBucket,
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
    if (!confirm("Xóa dự định này?")) return;

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
    <div
      className="relative overflow-hidden rounded-2xl border border-[#dccbb3] bg-[#ede0ce] p-2.5 sm:p-3"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 20% 10%, rgba(255,200,150,.2) 0%, transparent 55%)",
      }}
    >
      <style>{`
        @keyframes paperReveal {
          0% { opacity: 0; transform: rotate(var(--tilt)) translateY(14px); }
          100% { opacity: 1; transform: rotate(var(--tilt)) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes paperUnfold {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(.8) rotate(-4deg); }
          80% { transform: translate(-50%,-50%) scale(1.02) rotate(.5deg); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(0); }
        }
      `}</style>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(180,130,90,.06) 27px, rgba(180,130,90,.06) 28px)",
        }}
      />

      {isPending ? (
        <div className="relative z-10 mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Đang xử lý... Vui lòng chờ.
        </div>
      ) : null}

      <div className="relative z-10 mb-2 flex items-center justify-between gap-2 px-1">
        <span className="rounded-full border border-[#d9c8af] bg-white/75 px-3 py-1 text-[10px] font-semibold text-[#7a5a3a]">
          📝 {plans.length} dự định
        </span>
        <button
          type="button"
          onClick={() => setIsAdding((v) => !v)}
          className="rounded-full border border-[#d9c8af] bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#6a4a2b] hover:bg-white"
        >
          {isAdding ? "Ẩn" : "+ Thêm dự định"}
        </button>
      </div>

      {isAdding ? (
        <div className="relative z-10 mb-3 rounded-xl border border-[#d9c8af] bg-white/70 p-2.5">
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên dự định..."
              disabled={isPending}
              className="input-field !rounded-xl !py-2 text-xs"
            />
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value as PlanBucket)}
              disabled={isPending}
              className="input-field !rounded-xl !py-2 text-xs"
              aria-label="Kỳ hạn dự định"
            >
              {PLAN_BUCKETS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreatePlan}
              disabled={isPending}
              className="rounded-xl border border-[#d9c8af] bg-[#fffdfa] px-3 py-2 text-xs font-semibold text-[#6a4a2b] disabled:opacity-60"
            >
              Thêm
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Mô tả (tuỳ chọn)..."
            disabled={isPending}
            className="input-field mt-2 resize-none !rounded-xl !py-2 text-xs"
          />
        </div>
      ) : null}

      <PlanNotesCarousel
        plansByBucket={plansByBucket}
        onOpenPlan={(planId) => setDetailPlanId(planId)}
      />

      <PlanDetailModal
        isClient={isClient}
        plan={selectedPlan}
        isPending={isPending}
        editingTitle={editingTitle}
        editingDescription={editingDescription}
        editingBucket={editingBucket}
        setEditingTitle={setEditingTitle}
        setEditingDescription={setEditingDescription}
        setEditingBucket={setEditingBucket}
        onClose={() => setDetailPlanId(null)}
        onToggleCompleted={() =>
          selectedPlan && handleToggleCompleted(selectedPlan)
        }
        onSave={handleUpdatePlan}
        onDelete={() => selectedPlan && handleDeletePlan(selectedPlan.id)}
        getDisplayName={getDisplayName}
      />
    </div>
  );
}
