"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useTransition } from "react";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { createMemory, saveMediaRecords } from "@/lib/actions";
import type { MemoryType } from "@/lib/types";
import MediaUploader, { type UploadableFile } from "./MediaUploader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const memoryTypes: { value: MemoryType; label: string; icon: string }[] = [
  { value: "diary", label: "Nhật ký", icon: "📝" },
  { value: "photo", label: "Ảnh", icon: "📷" },
  { value: "video", label: "Video", icon: "🎬" },
  { value: "album", label: "Album", icon: "📚" },
];

export default function CreateMemoryModal() {
  const { isCreateOpen, closeCreate } = useTreeStore();
  const addToast = useUiStore((s) => s.addToast);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<MemoryType>("diary");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle("");
    setContent("");
    setType("diary");
    setDate(new Date().toISOString().slice(0, 10));
    setFiles([]);
  };

  const uploadFiles = async (memoryId: string, authorId: string) => {
    if (files.length === 0) return true;
    
    const supabase = createSupabaseBrowserClient();
    const mediaItems: { memory_id: string; storage_path: string; media_type: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fileExt = f.file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${authorId}/${memoryId}/${fileName}`;

      setFiles((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "uploading", progress: 0 };
        return next;
      });

      const { data, error } = await supabase.storage
        .from("media")
        .upload(filePath, f.file, { upsert: false });

      if (error) {
        console.error("Upload error:", error);
        setFiles((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: "error" };
          return next;
        });
        continue;
      }

      mediaItems.push({
        memory_id: memoryId,
        storage_path: data.path,
        media_type: f.file.type.startsWith("image/") ? "image" : "video",
      });

      setFiles((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "success", progress: 100 };
        return next;
      });
    }

    if (mediaItems.length > 0) {
      await saveMediaRecords(mediaItems);
    }
    return true; // Simple approach
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      addToast("Tên kỷ niệm không được trống", "error");
      return;
    }

    startTransition(async () => {
      const result = await createMemory({
        title: title.trim(),
        content: content.trim() || undefined,
        type,
        date: new Date(date).toISOString(),
        room_id: useTreeStore.getState().targetRoomId ?? undefined,
      });

      if (result.error) {
        addToast(result.error, "error");
      } else if (result.data) {
        const user = (await createSupabaseBrowserClient().auth.getUser()).data.user;
        if (user) {
          await uploadFiles(result.data.id, user.id);
        }
        
        addToast("Đã lưu lại khoảnh khắc! 🌱", "success");
        reset();
        closeCreate();
      }
    });
  };

  return (
    <AnimatePresence>
      {isCreateOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCreate}
        >
          <motion.div
            className="glass-card w-full max-w-lg rounded-3xl p-8 shadow-[var(--shadow-card)]"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-text-muted">
                  Kỷ niệm mới
                </p>
                <h2 className="mt-1 text-2xl text-foreground">
                  Thêm kỷ niệm
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-border-strong hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Type selector */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              {memoryTypes.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setType(mt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition ${
                    type === mt.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-text-muted hover:border-border-strong hover:text-text-secondary"
                  }`}
                >
                  <span className="text-lg">{mt.icon}</span>
                  {mt.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <div className="mt-5">
              <label
                htmlFor="memory-title"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted"
              >
                Tên kỷ niệm
              </label>
              <input
                id="memory-title"
                type="text"
                placeholder="VD: Buổi chiều ở Đà Lạt..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field mt-2"
                autoFocus
              />
            </div>

            {/* Content */}
            <div className="mt-4">
              <label
                htmlFor="memory-content"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted"
              >
                Nội dung
              </label>
              <textarea
                id="memory-content"
                placeholder="Ghi lại cảm xúc, chi tiết bạn muốn lưu giữ..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="input-field mt-2 resize-none"
              />
            </div>

            {/* Date */}
            <div className="mt-4">
              <label
                htmlFor="memory-date"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted"
              >
                Ngày
              </label>
              <input
                id="memory-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field mt-2"
              />
            </div>

            {/* Media Upload */}
            {(type === "photo" || type === "video" || type === "album") && (
              <div className="mt-4">
                <MediaUploader files={files} setFiles={setFiles} />
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit}
                className="btn-primary flex-1 px-6 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isPending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-surface border-t-white"></span>
                )}
                {isPending ? "Đang xử lý..." : "Lưu vào cây kỷ niệm 🌿"}
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  closeCreate();
                }}
                className="btn-secondary px-6 py-3 text-sm"
              >
                Hủy
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
