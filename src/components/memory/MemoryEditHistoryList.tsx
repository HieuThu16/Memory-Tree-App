"use client";

import type { MemoryEditHistoryRecord } from "@/lib/types";

const fieldLabels: Record<string, string> = {
  title: "tiêu đề",
  content: "nội dung",
  category: "thể loại",
  location: "địa điểm",
  date: "ngày",
  type: "loại",
};

function formatHistoryValue(value: string | null) {
  if (!value) {
    return "trống";
  }

  return value;
}

export default function MemoryEditHistoryList({
  entries,
  loading,
}: {
  entries: MemoryEditHistoryRecord[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-white/70 p-3 text-sm text-text-secondary">
        Đang tải lịch sử chỉnh sửa...
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-white/60 p-3 text-sm text-text-secondary">
        Chưa có chỉnh sửa nào được ghi lại cho kỉ niệm này.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-white/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-text-muted">
        Lịch sử chỉnh sửa
      </p>
      <div className="mt-3 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-border/60 bg-white/80 px-3 py-2 text-sm text-text-secondary"
          >
            <p className="font-medium text-foreground">
              {(entry.editor_name_snapshot || "Một người dùng").trim()} đã sửa{" "}
              {fieldLabels[entry.field_name] || entry.field_name}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Từ "{formatHistoryValue(entry.before_value)}" thành "
              {formatHistoryValue(entry.after_value)}"
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {new Date(entry.created_at).toLocaleString("vi-VN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
