"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useTransition } from "react";
import { MEMORY_SELECT } from "@/lib/supabase/selects";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteMedia, createMemory, updateMemory } from "@/lib/actions";
import MediaUploader, { type UploadableFile } from "./MediaUploader";

const personalCategorySuggestions = [
  "Gia đình",
  "Tình yêu",
  "Bạn bè",
  "Du lịch",
  "Sinh nhật",
  "Cột mốc",
  "Công việc",
  "Thường ngày",
];

const categoryIcons: Record<string, string> = {
  "Gia đình": "🏠",
  "Tình yêu": "💕",
  "Bạn bè": "👋",
  "Du lịch": "✈️",
  "Sinh nhật": "🎂",
  "Cột mốc": "🏆",
  "Công việc": "💼",
  "Thường ngày": "☀️",
};

export default function CreateMemoryModal() {
  const { isCreateOpen, closeCreate, targetRoomId, editingMemory } =
    useTreeStore();
  const addToast = useUiStore((s) => s.addToast);
  const upsertMemory = useMemoryStore((s) => s.upsertMemory);
  const prependHistory = useMemoryStore((s) => s.prependHistory);
  const isPersonalMemory = !targetRoomId;
  const isEditing = !!editingMemory;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [isPending, startTransition] = useTransition();

  const getMediaUrl = (path: string) => {
    return createSupabaseBrowserClient()
      .storage.from("media")
      .getPublicUrl(path).data.publicUrl;
  };

  const fetchLatestMemory = async (memoryId: string) => {
    const { data } = await createSupabaseBrowserClient()
      .from("memories")
      .select(MEMORY_SELECT)
      .eq("id", memoryId)
      .single();

    return data ?? null;
  };

  const handleDeleteExistingMedia = async (
    mediaId: string,
    storagePath: string,
  ) => {
    if (!confirm("Bỏ ảnh/video này khỏi kỉ niệm?")) return;

    startTransition(async () => {
      const res = await deleteMedia(mediaId, storagePath);
      if (res.error) {
        addToast("Xóa ảnh thất bại: " + res.error, "error");
      } else {
        addToast("Đã xóa ảnh 🗑️", "success");
        // Update editing memory locally to reflect deletion
        if (editingMemory && editingMemory.media) {
          const newMedia = editingMemory.media.filter((m) => m.id !== mediaId);
          upsertMemory({
            ...editingMemory,
            media: newMedia,
          });
          useTreeStore.getState().setEditingMemory({
            ...editingMemory,
            media: newMedia,
          });
        }
      }
    });
  };

  // Load exiting memory when editing
  useEffect(() => {
    if (isCreateOpen && editingMemory) {
      setTitle(editingMemory.title || "");
      setContent(editingMemory.content || "");
      setCategory(editingMemory.category || "");
      setLocation(editingMemory.location || "");

      let initialDate = new Date().toISOString().slice(0, 10);
      if (editingMemory.date) {
        initialDate = new Date(editingMemory.date).toISOString().slice(0, 10);
      } else if (editingMemory.created_at) {
        initialDate = new Date(editingMemory.created_at)
          .toISOString()
          .slice(0, 10);
      }
      setDate(initialDate);
    } else if (!isCreateOpen) {
      setTitle("");
      setContent("");
      setCategory("");
      setLocation("");
      setDate(new Date().toISOString().slice(0, 10));
      setFiles([]);
    }
  }, [isCreateOpen, editingMemory]);

  const reset = () => {
    setTitle("");
    setContent("");
    setCategory("");
    setLocation("");
    setDate(new Date().toISOString().slice(0, 10));
    setFiles([]);
  };

  const uploadFiles = async (memoryId: string, authorId: string) => {
    if (files.length === 0) return { success: true };

    const supabase = createSupabaseBrowserClient();
    const mediaItems: {
      memory_id: string;
      storage_path: string;
      media_type: string;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const fileExt = f.file.name.split(".").pop();
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
        return { success: false, error: "Tải file thất bại: " + error.message };
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
      const { error } = await supabase.from("media").insert(mediaItems);

      if (error) {
        console.error("Media DB error:", error);
        return { success: false, error: "Lỗi lưu file: " + error.message };
      }
    }

    return { success: true };
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      addToast("Chưa nhập tên kỉ niệm", "error");
      return;
    }

    startTransition(async () => {
      if (isEditing && editingMemory) {
        const result = await updateMemory(editingMemory.id, {
          title: title.trim(),
          content: content.trim() || undefined,
          category: isPersonalMemory ? category.trim() || undefined : undefined,
          location: location.trim() || undefined,
          date: new Date(date).toISOString(),
        });

        if (result.error) {
          addToast(result.error, "error");
        } else {
          const user = (await createSupabaseBrowserClient().auth.getUser()).data
            .user;
          if (user && files.length > 0) {
            const uploadResult = await uploadFiles(editingMemory.id, user.id);
            if (!uploadResult.success) {
              addToast(uploadResult.error || "Lỗi tải ảnh/video", "error");
              return; // Stop here, don't close modal or show success
            }
          }

          const latestMemory =
            files.length > 0
              ? await fetchLatestMemory(editingMemory.id)
              : (result.data?.memory ?? null);

          if (latestMemory) {
            upsertMemory(latestMemory);
          }

          if (result.data?.historyEntries?.length) {
            prependHistory(editingMemory.id, result.data.historyEntries);
          }

          addToast("Đã cập nhật 🌿", "success");
          reset();
          closeCreate();
        }
      } else {
        // Create new memory
        const inferredType = files.length > 0 ? "album" : "diary";

        const result = await createMemory({
          title: title.trim(),
          content: content.trim() || undefined,
          category: isPersonalMemory ? category.trim() || undefined : undefined,
          location: location.trim() || undefined,
          type: inferredType,
          date: new Date(date).toISOString(),
          room_id: targetRoomId ?? undefined,
        });

        if (result.error) {
          addToast(result.error, "error");
        } else if (result.data?.memory) {
          const user = (await createSupabaseBrowserClient().auth.getUser()).data
            .user;
          if (user && files.length > 0) {
            const uploadResult = await uploadFiles(
              result.data.memory.id,
              user.id,
            );
            if (!uploadResult.success) {
              addToast(uploadResult.error || "Lỗi tải ảnh/video", "error");
              return; // Stop here, don't close modal
            }
          }

          const latestMemory =
            files.length > 0
              ? await fetchLatestMemory(result.data.memory.id)
              : result.data.memory;

          if (latestMemory) {
            upsertMemory(latestMemory);
          }

          addToast("Đã lưu kỉ niệm! 🌱", "success");
          reset();
          closeCreate();
        }
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
            className="glass-card flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl shadow-[var(--shadow-card)] sm:max-w-lg sm:rounded-3xl"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isEditing ? "✏️" : "🌱"}</span>
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  {isEditing ? "Sửa kỉ niệm" : "Tạo kỉ niệm"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-accent hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="memory-title"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                >
                  🏷️ Tên
                </label>
                <input
                  id="memory-title"
                  type="text"
                  placeholder="VD: Buổi chiều ở Đà Lạt..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field mt-1.5 !rounded-xl !py-2.5 !text-sm"
                  autoFocus
                />
              </div>

              {/* Location */}
              <div className="mt-3">
                <label
                  htmlFor="memory-location"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                >
                  📍 Địa điểm
                </label>
                <input
                  id="memory-location"
                  type="text"
                  placeholder="VD: Quán cafe quen thuộc..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field mt-1.5 !rounded-xl !py-2.5 !text-sm"
                />
              </div>

              {/* Content */}
              <div className="mt-3">
                <label
                  htmlFor="memory-content"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                >
                  📝 Nội dung
                </label>
                <textarea
                  id="memory-content"
                  placeholder="Ghi lại cảm xúc..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="input-field mt-1.5 resize-none !rounded-xl !py-2.5 !text-sm"
                />
              </div>

              {isPersonalMemory ? (
                <div className="mt-3">
                  <label
                    htmlFor="memory-category"
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                  >
                    ✿ Thể loại
                  </label>
                  <input
                    id="memory-category"
                    type="text"
                    placeholder="VD: Chuyến đi, Gia đình..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field mt-1.5 !rounded-xl !py-2.5 !text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {personalCategorySuggestions.map((item) => {
                      const active =
                        category.trim().toLowerCase() === item.toLowerCase();

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCategory(item)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-white/75 text-text-secondary hover:border-accent hover:text-accent"
                          }`}
                        >
                          {categoryIcons[item] || "✿"} {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Date */}
              <div className="mt-3">
                <label
                  htmlFor="memory-date"
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                >
                  🗓 Ngày
                </label>
                <input
                  id="memory-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field mt-1.5 !rounded-xl !py-2.5 !text-sm"
                />
              </div>

              {/* Existing Media Display */}
              {isEditing &&
                editingMemory &&
                editingMemory.media &&
                editingMemory.media.length > 0 && (
                  <div className="mt-3">
                    <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">
                      🖼️ Ảnh / Video hiện tại
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {editingMemory.media.map((media) => (
                        <div
                          key={media.id}
                          className="relative flex-none aspect-[4/5] w-24 rounded-xl overflow-hidden border border-border bg-black/5"
                        >
                          {media.media_type === "video" ? (
                            <video
                              src={getMediaUrl(media.storage_path)}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <img
                              src={getMediaUrl(media.storage_path)}
                              className="w-full h-full object-contain p-1"
                              alt=""
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteExistingMedia(
                                media.id,
                                media.storage_path,
                              )
                            }
                            title="Xóa media hiện tại"
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 text-white flex justify-center items-center backdrop-blur hover:bg-rose/80"
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Media Upload */}
              <div className="mt-3">
                <MediaUploader files={files} setFiles={setFiles} />
              </div>
            </div>

            {/* Fixed Footer with action buttons - always visible */}
            <div className="border-t border-border px-4 py-3 sm:px-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSubmit}
                  className="btn-primary flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60"
                >
                  {isPending && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface border-t-white"></span>
                  )}
                  {isPending
                    ? "Đang lưu..."
                    : isEditing
                      ? "Cập nhật 🌿"
                      : "Lưu kỉ niệm 🌿"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    closeCreate();
                  }}
                  className="btn-secondary px-4 py-2.5 text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
