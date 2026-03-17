"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { MemoryParticipant, RoomPlanRecord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/stores/uiStore";
import {
  PLAN_BUCKETS,
  TILTS,
  TAPE_PATTERN,
  formatDate,
  formatDateTime,
  monthLabel,
  iconFromTitle,
  getPlanColorTheme,
  parsePlanDescription,
  formatPlanDescription,
} from "./plansJournalConfig";
import type { PlanBucket } from "./plansJournalConfig";

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
        pointerEvents: selectedPlan ? "none" : "auto",
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

      <div className="relative z-10 overflow-x-auto pb-1">
        <div className="min-w-[860px]">
          <div className="mb-2 flex items-center justify-center">
            <div className="relative inline-block">
              <div
                className="absolute -left-4 -right-4 -top-1 h-4 rounded-sm opacity-90"
                style={{ background: TAPE_PATTERN("#ffd6e0") }}
              />
              <div className="rounded bg-white/75 px-8 py-2 shadow-[2px_3px_14px_rgba(100,60,30,.1)]">
                <div className="text-center text-xl font-bold tracking-[0.4em] text-[#6b3a1f]">
                  2026
                </div>
                <div className="mt-0.5 text-center text-[10px] tracking-[0.25em] text-[#a07848]">
                  nhật ký dự định
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 px-1">
            {PLAN_BUCKETS.map((col) => {
              const bucketPlans = plansByBucket.get(col.key) ?? [];
              return (
                <div key={col.key}>
                  <div
                    className="mb-2 rounded-t-md border-b-[3px] p-3 text-center shadow-[0_2px_8px_rgba(0,0,0,.06)]"
                    style={{
                      background: col.hdr,
                      borderBottomColor: col.tape,
                    }}
                  >
                    <div className="mb-1 text-xl">{col.icon}</div>
                    <div
                      className="text-base font-bold"
                      style={{ color: col.accent }}
                    >
                      {col.key}
                    </div>
                    <div className="text-xs text-black/45">{col.sub}</div>
                  </div>

                  <div className="space-y-3">
                    {bucketPlans.length === 0 ? (
                      <div className="rounded-md border border-[#dccbb3] bg-white/45 px-3 py-5 text-center text-xs text-[#9b7a59]">
                        Chưa có dự định
                      </div>
                    ) : (
                      bucketPlans.map((plan, idx) => {
                        const tilt = TILTS[idx % TILTS.length];
                        const visual = getPlanColorTheme(
                          `${plan.id}:${plan.title}`,
                        );
                        const parsed = parsePlanDescription(plan.description);
                        return (
                          <div
                            key={plan.id}
                            style={{
                              ["--tilt" as string]: `${tilt}deg`,
                              animation: `paperReveal .5s ease ${idx * 0.08}s both`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setDetailPlanId(plan.id)}
                              className="relative block w-full rounded-md border border-[#e8dcc9] p-3 text-center shadow-[2px_3px_10px_rgba(0,0,0,.1)] transition-transform hover:scale-[1.02]"
                              style={{
                                transform: `rotate(${tilt}deg)`,
                                background: plan.is_completed
                                  ? "linear-gradient(145deg,#fff,#f8f8f8)"
                                  : visual.card,
                              }}
                            >
                              <div
                                className="absolute -top-2 left-1/2 h-4 w-9 -translate-x-1/2 rounded-sm opacity-95"
                                style={{ background: TAPE_PATTERN(col.tape) }}
                              />
                              <div className="mb-1 text-lg">
                                {iconFromTitle(plan.title)}
                              </div>
                              <div
                                className={`line-clamp-2 text-[13px] font-bold leading-snug ${
                                  plan.is_completed
                                    ? "text-[#8f7d67] line-through"
                                    : "text-[#3a2010]"
                                }`}
                              >
                                {plan.title}
                              </div>
                              <div
                                className="mt-1 text-[11px] italic"
                                style={{ color: visual.accent }}
                              >
                                {formatDate(plan.created_at)}
                              </div>
                              {parsed.text ? (
                                <div className="mt-1 line-clamp-1 text-[11px] text-[#6d4b2d]/80">
                                  {parsed.text}
                                </div>
                              ) : null}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPlan && isClient
        ? createPortal(
            (() => {
              const detailVisual = getPlanColorTheme(
                `${selectedPlan.id}:${selectedPlan.title}:detail`,
              );
              return (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    style={{
                      zIndex: 2147483646,
                      pointerEvents: "auto",
                      background:
                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0%, rgba(255,244,229,0.7) 55%, rgba(255,239,214,0.78) 100%)",
                      animation: "fadeIn .25s ease",
                    }}
                    onClick={() => setDetailPlanId(null)}
                  />

                  <div
                    className="fixed left-1/2 top-1/2 z-[9999] w-[min(94vw,460px)]"
                    style={{
                      zIndex: 2147483647,
                      pointerEvents: "auto",
                      transform: "translate(-50%,-50%)",
                      animation: "paperUnfold .35s cubic-bezier(.34,1.4,.64,1)",
                    }}
                  >
                    <div
                      className="relative rounded-lg border border-[#dbc7a9] p-5 shadow-[0_20px_45px_rgba(0,0,0,.18)]"
                      style={{
                        background: detailVisual.detail,
                        backgroundImage:
                          "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(180,130,90,.05) 27px, rgba(180,130,90,.05) 28px)",
                      }}
                    >
                      <div
                        className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 rounded-sm opacity-95"
                        style={{ background: TAPE_PATTERN("#d8c4a8") }}
                      />

                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6040]">
                            Chi tiết dự định
                          </p>
                          <p className="truncate text-sm font-bold text-[#3a2010]">
                            {selectedPlan.title}
                          </p>
                        </div>
                        <div className="flex-shrink-0 rounded-full border border-[#d7c3a8] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6a4a2b]">
                          {selectedPlan.is_completed ? "Đã xong" : "Đang làm"}
                        </div>
                      </div>

                      <div className="mb-3 text-center text-3xl">
                        {iconFromTitle(selectedPlan.title)}
                      </div>

                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="input-field mb-2 !rounded-xl !border-[#d6c4ac] !bg-white !py-2.5 !text-sm text-[#3a2010]"
                        disabled={isPending}
                        aria-label="Tên dự định"
                        placeholder="Tên dự định"
                      />

                      <select
                        value={editingBucket}
                        onChange={(e) =>
                          setEditingBucket(e.target.value as PlanBucket)
                        }
                        className="input-field mb-2 !rounded-xl !border-[#d6c4ac] !bg-white !py-2.5 !text-sm text-[#3a2010]"
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
                        className="input-field mb-3 resize-none !rounded-xl !border-[#d6c4ac] !bg-white !py-2.5 !text-sm text-[#3a2010]"
                        disabled={isPending}
                        aria-label="Mô tả dự định"
                        placeholder="Mô tả dự định"
                      />

                      <div className="mb-4 rounded-xl border border-[#e1d1ba] bg-white/95 p-2.5 text-[11px] text-[#6b4a2d]">
                        <p>
                          ✦ {formatDate(selectedPlan.created_at)} ·{" "}
                          {monthLabel(selectedPlan.created_at)}
                        </p>
                        <p>Thêm bởi {getDisplayName(selectedPlan.added_by)}</p>
                        <p>
                          Cập nhật {formatDateTime(selectedPlan.updated_at)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCompleted(selectedPlan)}
                          disabled={isPending}
                          className="rounded-lg border border-[#d2be9f] bg-[#fffdfa] px-2 py-2.5 text-xs font-semibold text-[#6a4a2b] disabled:opacity-60"
                        >
                          {selectedPlan.is_completed
                            ? "Bỏ hoàn thành"
                            : "Đánh dấu xong"}
                        </button>
                        <button
                          type="button"
                          onClick={handleUpdatePlan}
                          disabled={isPending}
                          className="rounded-lg border border-[#d2be9f] bg-[#fffdfa] px-2 py-2.5 text-xs font-semibold text-[#6a4a2b] disabled:opacity-60"
                        >
                          Lưu chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(selectedPlan.id)}
                          disabled={isPending}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2.5 text-xs font-semibold text-rose-600 disabled:opacity-60"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailPlanId(null)}
                          className="rounded-lg border border-[#d2be9f] bg-white px-2 py-2.5 text-xs font-semibold text-[#6a4a2b]"
                        >
                          Đóng lại
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })(),
            document.body,
          )
        : null}
    </div>
  );
}
