"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { MemoryParticipant, RoomCountdownRecord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/stores/uiStore";
import BackButton from "@/components/ui/BackButton";

const COUNTDOWN_SELECT =
  "id, room_id, added_by, title, description, target_date, emoji, is_passed, created_at, updated_at";

const EMOJI_OPTIONS = ["🎯", "❤️", "🎂", "✈️", "🎓", "💍", "🏠", "🎄", "🌸", "🎉", "🎵", "🏖️", "📅", "⭐", "🌈"];

type Props = {
  roomId: string;
  currentUserId: string;
  initialCountdowns: RoomCountdownRecord[];
  participantsByUserId: Map<string, MemoryParticipant>;
};

function computeCountdown(targetDate: string) {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    // Already passed
    const pastMs = Math.abs(diffMs);
    const pastDays = Math.floor(pastMs / (1000 * 60 * 60 * 24));
    return { isPast: true, days: pastDays, hours: 0, minutes: 0, seconds: 0, totalMs: pastMs };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { isPast: false, days, hours, minutes, seconds, totalMs: diffMs };
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [countdown, setCountdown] = useState(() => computeCountdown(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(computeCountdown(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (countdown.isPast) {
    return (
      <div className="flex items-center gap-1.5 text-rose-500">
        <span className="text-xs font-medium">Đã qua {countdown.days} ngày trước</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <TimeUnit value={countdown.days} label="ngày" />
      <span className="text-text-muted text-xs font-bold">:</span>
      <TimeUnit value={countdown.hours} label="giờ" />
      <span className="text-text-muted text-xs font-bold">:</span>
      <TimeUnit value={countdown.minutes} label="phút" />
      <span className="text-text-muted text-xs font-bold">:</span>
      <TimeUnit value={countdown.seconds} label="giây" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="inline-flex min-w-[32px] items-center justify-center rounded-lg bg-gradient-to-b from-accent/10 to-accent/5 px-1.5 py-1 text-base font-bold tabular-nums text-accent">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}

const formatDate = (value: string) => {
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

export default function RoomCountdownBoard({
  roomId,
  currentUserId,
  initialCountdowns,
  participantsByUserId,
}: Props) {
  const addToast = useUiStore((state) => state.addToast);
  const [countdowns, setCountdowns] = useState<RoomCountdownRecord[]>(initialCountdowns);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [emoji, setEmoji] = useState("🎯");

  // Detail modal state
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editEmoji, setEditEmoji] = useState("🎯");

  // Filter
  const [filter, setFilter] = useState<"all" | "upcoming" | "passed">("all");

  useEffect(() => {
    setCountdowns(initialCountdowns);
  }, [initialCountdowns]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`room_countdowns:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_countdowns",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const inserted = payload.new as RoomCountdownRecord;
          setCountdowns((prev) => {
            const next = [inserted, ...prev.filter((c) => c.id !== inserted.id)];
            return next.sort(
              (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime(),
            );
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_countdowns",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as RoomCountdownRecord;
          setCountdowns((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_countdowns",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setCountdowns((prev) => prev.filter((c) => c.id !== deletedId));
          setDetailId((prev) => (prev === deletedId ? null : prev));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const selectedCountdown = useMemo(
    () => countdowns.find((c) => c.id === detailId) ?? null,
    [detailId, countdowns],
  );

  const filteredCountdowns = useMemo(() => {
    const now = new Date();
    if (filter === "upcoming") {
      return countdowns.filter((c) => new Date(c.target_date).getTime() > now.getTime());
    }
    if (filter === "passed") {
      return countdowns.filter((c) => new Date(c.target_date).getTime() <= now.getTime());
    }
    return countdowns;
  }, [filter, countdowns]);

  useEffect(() => {
    if (selectedCountdown) {
      setEditTitle(selectedCountdown.title);
      setEditDescription(selectedCountdown.description || "");
      setEditTargetDate(
        new Date(selectedCountdown.target_date).toISOString().slice(0, 16),
      );
      setEditEmoji(selectedCountdown.emoji || "🎯");
    }
  }, [selectedCountdown]);

  const getDisplayName = (userId: string | null) => {
    if (!userId) return "-";
    return participantsByUserId.get(userId)?.displayName ?? "Thành viên";
  };

  const handleCreate = () => {
    if (!title.trim()) {
      addToast("Nhập tên sự kiện trước khi thêm.", "error");
      return;
    }
    if (!targetDate) {
      addToast("Chọn ngày mục tiêu.", "error");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_countdowns")
        .insert({
          room_id: roomId,
          added_by: currentUserId,
          title: title.trim(),
          description: description.trim() || null,
          target_date: new Date(targetDate).toISOString(),
          emoji,
        })
        .select(COUNTDOWN_SELECT)
        .single();

      if (error || !data) {
        addToast(error?.message ?? "Không thể thêm ngày đếm ngược.", "error");
        return;
      }

      setCountdowns((prev) => {
        const next = [data as RoomCountdownRecord, ...prev];
        return next.sort(
          (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime(),
        );
      });

      setTitle("");
      setDescription("");
      setTargetDate("");
      setEmoji("🎯");
      addToast("Đã thêm ngày quan trọng mới! 🎯", "success");
    });
  };

  const handleUpdate = () => {
    if (!selectedCountdown) return;
    if (!editTitle.trim()) {
      addToast("Tên sự kiện không được để trống.", "error");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("room_countdowns")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          target_date: new Date(editTargetDate).toISOString(),
          emoji: editEmoji,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCountdown.id)
        .eq("room_id", roomId)
        .select(COUNTDOWN_SELECT)
        .single();

      if (error) {
        addToast(error.message ?? "Không thể cập nhật.", "error");
        return;
      }

      if (data) {
        setCountdowns((prev) =>
          prev.map((c) => (c.id === data.id ? (data as RoomCountdownRecord) : c)),
        );
      }

      addToast("Đã cập nhật ngày quan trọng.", "success");
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Xóa ngày đếm ngược này?")) return;

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("room_countdowns")
        .delete()
        .eq("id", id)
        .eq("room_id", roomId);

      if (error) {
        addToast(error.message ?? "Không thể xóa.", "error");
        return;
      }

      setCountdowns((prev) => prev.filter((c) => c.id !== id));
      setDetailId((prev) => (prev === id ? null : prev));
      addToast("Đã xóa ngày đếm ngược.", "success");
    });
  };

  // Find the nearest upcoming countdown for hero display
  const nextUpcoming = useMemo(() => {
    const now = new Date().getTime();
    const upcoming = countdowns
      .filter((c) => new Date(c.target_date).getTime() > now)
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
    return upcoming[0] ?? null;
  }, [countdowns]);

  return (
    <div className="space-y-3 rounded-2xl bg-white/80 p-3 sm:p-4">
      {isPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Đang xử lý... Vui lòng chờ.
        </div>
      )}

      {/* Hero countdown card */}
      {nextUpcoming && (
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-white to-pink-50/50 p-4 shadow-[0_4px_20px_-8px_rgba(108,76,215,0.2)]">
          <div className="absolute right-3 top-3 text-4xl opacity-20">{nextUpcoming.emoji}</div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            ⏰ Sự kiện tiếp theo
          </p>
          <h3 className="mt-1.5 text-base font-semibold text-foreground">{nextUpcoming.emoji} {nextUpcoming.title}</h3>
          <p className="mt-0.5 text-[11px] text-text-muted">{formatDate(nextUpcoming.target_date)}</p>
          <div className="mt-3">
            <CountdownTimer targetDate={nextUpcoming.target_date} />
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-2xl border border-border bg-white/85 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
          ⏰ Thêm ngày quan trọng
        </p>
        <div className="mt-2 grid gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên sự kiện (VD: Kỉ niệm 1 năm, Sinh nhật)..."
            disabled={isPending}
            className="input-field !rounded-xl !py-2.5 text-sm"
          />
          <input
            type="datetime-local"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            disabled={isPending}
            className="input-field !rounded-xl !py-2.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ghi chú thêm..."
            rows={2}
            disabled={isPending}
            className="input-field resize-none !rounded-xl !py-2.5 text-sm"
          />
          <div>
            <p className="text-[10px] text-text-muted mb-1">Chọn biểu tượng:</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`rounded-lg border px-2 py-1 text-base transition-all ${
                    emoji === e
                      ? "border-accent bg-accent/10 shadow-sm scale-110"
                      : "border-border bg-white hover:border-accent/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="btn-primary rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
          >
            {isPending ? "Đang thêm..." : "⏰ Thêm ngày đếm ngược"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-white/85 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-text-secondary">
            {filteredCountdowns.length}/{countdowns.length} ngày
          </p>
          <div className="inline-flex rounded-full border border-border bg-white p-1">
            {(["all", "upcoming", "passed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  filter === f
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-white/70"
                }`}
              >
                {f === "all" ? "Tất cả" : f === "upcoming" ? "Sắp tới" : "Đã qua"}
              </button>
            ))}
          </div>
        </div>

        {filteredCountdowns.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-white/70 px-3 py-4 text-center text-sm text-text-muted">
            {filter === "all"
              ? "Chưa có ngày quan trọng nào. Thêm ngay phía trên!"
              : "Không có ngày phù hợp bộ lọc."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredCountdowns.map((countdown) => {
              const cd = computeCountdown(countdown.target_date);
              return (
                <button
                  key={countdown.id}
                  type="button"
                  onClick={() => setDetailId(countdown.id)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="mt-0.5 text-xl">{countdown.emoji}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${cd.isPast ? "text-text-muted line-through" : "text-foreground"}`}>
                          {countdown.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {formatDate(countdown.target_date)}
                        </p>
                        {!cd.isPast ? (
                          <p className="mt-1 text-xs font-medium text-accent">
                            Còn {cd.days > 0 ? `${cd.days} ngày ` : ""}{cd.hours}h {cd.minutes}m
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-rose-400">
                            Đã qua {cd.days} ngày trước
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="mt-0.5 text-text-muted text-xs">›</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-[10px] text-text-muted">
                      Thêm bởi {getDisplayName(countdown.added_by)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedCountdown && (
        <div className="fixed inset-0 z-[90] h-[100dvh] w-screen bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <BackButton onClick={() => setDetailId(null)} />
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedCountdown.emoji} Chi tiết đếm ngược
              </p>
              <button
                type="button"
                onClick={() => handleDelete(selectedCountdown.id)}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
              >
                🗑 Xóa
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {/* Hero countdown in detail */}
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-white to-pink-50/50 p-4 text-center">
                <p className="text-4xl">{selectedCountdown.emoji}</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{selectedCountdown.title}</h3>
                <p className="mt-1 text-xs text-text-muted">{formatDate(selectedCountdown.target_date)}</p>
                <div className="mt-3 flex justify-center">
                  <CountdownTimer targetDate={selectedCountdown.target_date} />
                </div>
              </div>

              {/* Edit form */}
              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Tên sự kiện
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isPending}
                  className="input-field mt-2 !rounded-xl !py-2.5 text-sm"
                />
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Ngày mục tiêu
                </label>
                <input
                  type="datetime-local"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  disabled={isPending}
                  className="input-field mt-2 !rounded-xl !py-2.5 text-sm"
                />
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Biểu tượng
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEditEmoji(e)}
                      className={`rounded-lg border px-2 py-1 text-base transition-all ${
                        editEmoji === e
                          ? "border-accent bg-accent/10 shadow-sm scale-110"
                          : "border-border bg-white hover:border-accent/50"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3">
                <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
                  Ghi chú
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  disabled={isPending}
                  className="input-field mt-2 resize-none !rounded-xl !py-2.5 text-sm"
                />
              </div>

              <div className="rounded-2xl border border-border bg-white/85 p-3 text-xs text-text-secondary">
                <p>Người thêm: {getDisplayName(selectedCountdown.added_by)}</p>
                <p>Thời gian thêm: {formatDate(selectedCountdown.created_at)}</p>
              </div>

              <div className="flex gap-2 pb-2">
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isPending}
                  className="btn-primary rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  {isPending ? "Đang lưu..." : "💾 Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
