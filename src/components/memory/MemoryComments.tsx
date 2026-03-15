"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { CommentWithAuthor } from "@/lib/types";
import {
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
  saveCommentMedia,
} from "@/lib/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUiStore } from "@/lib/stores/uiStore";

const commentTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function getMediaPublicUrl(storagePath: string) {
  const supabase = createSupabaseBrowserClient();
  const { data } = supabase.storage.from("media").getPublicUrl(storagePath);
  return data.publicUrl;
}

function CommentMediaPreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isVideo = file.type.startsWith("video/");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border">
      {isVideo ? (
        <video
          src={previewUrl ?? undefined}
          className="h-full w-full object-cover"
          muted
        />
      ) : (
        previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        )
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

function CommentMediaItem({
  storagePath,
  mediaType,
}: {
  storagePath: string;
  mediaType: string | null;
}) {
  const url = getMediaPublicUrl(storagePath);
  const isVideo = mediaType?.startsWith("video") ?? false;

  return isVideo ? (
    <video
      src={url}
      controls
      className="mt-2 max-h-48 w-full rounded-xl border border-border object-cover"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="mt-2 max-h-48 w-full rounded-xl border border-border object-cover"
      loading="lazy"
    />
  );
}

function SingleComment({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  comment: CommentWithAuthor;
  currentUserId: string;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const isOwnComment = comment.user_id === currentUserId;

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onUpdate(comment.id, editContent);
    setIsEditing(false);
  };

  const initials = comment.author_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group flex gap-2.5 rounded-2xl p-2 transition hover:bg-white/50">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-green/20 text-[10px] font-bold text-accent">
        {comment.author_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.author_avatar}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Author & time */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            {comment.author_name}
          </span>
          <span className="text-[10px] text-text-muted">
            {commentTimeFormatter.format(new Date(comment.created_at))}
          </span>
          {comment.created_at !== comment.updated_at && (
            <span className="text-[9px] italic text-text-muted">(đã sửa)</span>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="input-field !rounded-xl !py-2 text-xs"
              rows={2}
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold text-white"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="rounded-full border border-border px-3 py-1 text-[10px] text-text-secondary"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-text-secondary">
            {comment.content}
          </p>
        )}

        {/* Media */}
        {comment.comment_media && comment.comment_media.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {comment.comment_media.map((m) => (
              <CommentMediaItem
                key={m.id}
                storagePath={m.storage_path}
                mediaType={m.media_type}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        {isOwnComment && !isEditing && (
          <div className="mt-1 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-[10px] font-semibold text-accent hover:underline"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="text-[10px] font-semibold text-rose hover:underline"
            >
              Xóa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MemoryComments({
  memoryId,
  roomId,
  currentUserId,
}: {
  memoryId: string;
  roomId: string | null;
  currentUserId: string;
}) {
  const addToast = useUiStore((s) => s.addToast);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newContent, setNewContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load comments
  const loadComments = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchComments(memoryId);
    setComments(result.data);
    setIsLoading(false);
  }, [memoryId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  // Realtime subscription for comments
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`comments:${memoryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memory_comments",
          filter: `memory_id=eq.${memoryId}`,
        },
        () => {
          // Reload all comments on any change (simplest approach with author enrichment)
          void loadComments();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memoryId, loadComments]);

  // Auto-scroll on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleAddMedia = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setMediaFiles((prev) => [...prev, ...files].slice(0, 5)); // max 5 files
    if (e.target) e.target.value = "";
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!newContent.trim() && mediaFiles.length === 0) {
      addToast("Nhập nội dung hoặc thêm ảnh/video.", "error");
      return;
    }

    startTransition(async () => {
      const result = await createComment({
        memoryId,
        content: newContent.trim(),
        roomId,
      });

      if (result.error || !result.data) {
        addToast(result.error || "Không thể gửi bình luận.", "error");
        return;
      }

      // Upload media if any
      if (mediaFiles.length > 0) {
        const supabase = createSupabaseBrowserClient();
        const mediaItems: {
          comment_id: string;
          storage_path: string;
          media_type: string;
        }[] = [];

        for (const file of mediaFiles) {
          const ext = file.name.split(".").pop() ?? "bin";
          const path = `comments/${result.data.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(path, file, { cacheControl: "3600" });

          if (!uploadError) {
            mediaItems.push({
              comment_id: result.data.id,
              storage_path: path,
              media_type: file.type.startsWith("video/") ? "video" : "image",
            });
          }
        }

        if (mediaItems.length > 0) {
          await saveCommentMedia(mediaItems);
        }
      }

      setNewContent("");
      setMediaFiles([]);
      void loadComments();
      addToast("Đã gửi bình luận 💬", "success");
    });
  };

  const handleUpdate = (commentId: string, content: string) => {
    startTransition(async () => {
      const result = await updateComment(commentId, content);
      if (result.error) {
        addToast(result.error, "error");
        return;
      }
      void loadComments();
      addToast("Đã sửa bình luận.", "success");
    });
  };

  const handleDelete = (commentId: string) => {
    if (!confirm("Xóa bình luận này?")) return;
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.error) {
        addToast(result.error, "error");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast("Đã xóa bình luận.", "success");
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-gradient-to-b from-white/40 to-white/20 p-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <span className="text-base">💬</span>
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Bình luận
        </h4>
        <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
          {comments.length}
        </span>
      </div>

      {/* Comments list */}
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto overscroll-contain py-2"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            Chưa có bình luận nào. Hãy là người đầu tiên! 🌸
          </p>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <SingleComment
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* New comment input */}
      <div
        className="border-t border-border/40 pt-2"
        onPointerDownCapture={(e) => e.stopPropagation()}
      >
        {/* Media previews */}
        {mediaFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {mediaFiles.map((file, index) => (
              <CommentMediaPreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => handleRemoveMedia(index)}
              />
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Media button */}
          <button
            type="button"
            onClick={handleAddMedia}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white/80 text-text-secondary transition hover:border-accent hover:text-accent"
            title="Thêm ảnh/video"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Text input */}
          <div className="flex flex-1 items-end rounded-2xl border border-border bg-white/90 px-3 py-2 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-glow)]">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Viết bình luận..."
              rows={1}
              className="max-h-20 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-text-muted"
            />
          </div>

          {/* Send */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isPending || (!newContent.trim() && mediaFiles.length === 0)
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-md transition active:scale-95 disabled:opacity-50"
            title="Gửi"
          >
            {isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
