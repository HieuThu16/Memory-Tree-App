"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { MemoryRecord, MediaRecord } from "@/lib/types";
import { getMediaPublicUrl } from "@/lib/media";
import { deleteMemory } from "@/lib/actions";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useTreeStore } from "@/lib/stores/treeStore";
import { useUiStore } from "@/lib/stores/uiStore";

function isImage(m: MediaRecord) {
  const t = m.media_type?.toLowerCase() ?? "";
  return !t || t === "image" || t.startsWith("image/");
}

function isVideo(m: MediaRecord) {
  const t = m.media_type?.toLowerCase() ?? "";
  return t === "video" || t.startsWith("video/");
}

const formatFullDate = (memory: MemoryRecord) => {
  const raw = memory.date ?? memory.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "?";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day} tháng ${month}, ${year}`;
};

/* ── Lightbox ── */
function Lightbox({
  url,
  type,
  onClose,
}: {
  url: string;
  type: "image" | "video";
  onClose: () => void;
}) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = url.split("/").pop() ?? "download";
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-bold text-white hover:bg-white/30 transition-all"
        >
          ⬇️ Tải về
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white text-lg hover:bg-white/30 transition-all"
        >
          ✕
        </button>
      </div>

      {type === "image" ? (
        <img
          src={url}
          alt=""
          className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="max-h-[85vh] max-w-[95vw] rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

export default function MemoryDetailClient({
  memory,
  roomId,
  year,
  month,
  currentUserId,
  participants = [],
}: {
  memory: MemoryRecord;
  roomId: string;
  year: number;
  month: number;
  currentUserId: string;
  participants?: MemoryParticipant[];
}) {
  const router = useRouter();
  const removeMemory = useMemoryStore((s) => s.removeMemory);
  const setEditingMemory = useTreeStore((s) => s.setEditingMemory);
  const addToast = useUiStore((s) => s.addToast);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [lightbox, setLightbox] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  const allMedia = memory.media ?? [];
  const images = allMedia.filter(isImage);
  const videos = allMedia.filter(isVideo);

  // Find author info
  const author = participants.find(p => p.userId === memory.user_id);

  const handleDelete = () => {
    if (!confirm("Bạn có chắc muốn xóa kỉ niệm này?")) return;
    startDeleteTransition(async () => {
      const result = await deleteMemory(memory.id);
      if (result.error) {
        addToast(result.error, "error");
      } else {
        removeMemory(memory.id);
        addToast("Đã xóa kỉ niệm 🍂", "success");
        router.push(`/friends/${roomId}`);
      }
    });
  };

  const handleEdit = () => {
    setEditingMemory(memory);
    router.push(`/friends/${roomId}`);
  };

  return (
    <>
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Link
            href={`/friends/${roomId}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-emerald-800 shadow-sm border border-emerald-500/10 hover:bg-white/80 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex-1" />
          {memory.user_id === currentUserId && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1.5 rounded-full bg-white/60 border border-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-white/80 transition-all"
              >
                ✏️ Sửa
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-full bg-white/60 border border-rose-500/15 px-4 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-50/80 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                    Xóa...
                  </span>
                ) : (
                  "🗑️ Xóa"
                )}
              </button>
            </>
          )}
        </div>

        {/* Main card */}
        <div className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/75 shadow-lg backdrop-blur-md">
          {/* Content FIRST */}
          <div className="p-6 sm:p-8 pb-4">
            {/* Author Section */}
            <div className="mb-4 flex items-center gap-3">
              {author?.avatarUrl ? (
                <img src={author.avatarUrl} alt="" className="h-10 w-10 rounded-full border-2 border-white shadow-sm" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-white shadow-sm text-emerald-600 font-bold text-sm">
                  {author?.displayName?.slice(0, 1) || "?"}
                </div>
              )}
              <div>
                <p className="text-[14px] font-black text-emerald-950">{author?.displayName || "Thành viên ẩn danh"}</p>
                <p className="text-[11px] font-bold text-emerald-700/50 uppercase tracking-wider">Người đăng kỉ niệm</p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-emerald-950 leading-tight">
              {memory.title}
            </h1>

            <p className="mt-2 text-[14px] font-bold text-emerald-700/60">
              📅 {formatFullDate(memory)}
            </p>

            {memory.content && (
              <div className="mt-6 rounded-3xl bg-white/40 border border-white/60 p-5 shadow-sm">
                <p className="text-[15px] sm:text-[16px] text-emerald-900/80 whitespace-pre-wrap leading-relaxed font-medium">
                  {memory.content}
                </p>
              </div>
            )}

            {/* Meta */}
            <div className="mt-6 flex flex-wrap gap-3">
              {memory.location && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-[13px] text-emerald-800 font-bold border border-emerald-500/5">
                  <span className="text-base">📍</span> {memory.location}
                </div>
              )}
              {memory.category && (
                <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-[13px] text-blue-800 font-bold border border-blue-500/5">
                  <span className="text-base">🏷️</span> {memory.category}
                </div>
              )}
            </div>
          </div>

          {/* Media Gallery SECOND */}
          {(images.length > 0 || videos.length > 0) && (
            <div className="p-5 sm:p-6 pt-2 border-t border-emerald-500/10 mt-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {/* Images */}
                {images.map((img) => {
                  const url = getMediaPublicUrl(img.storage_path);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setLightbox({ url, type: "image" })}
                      className="aspect-square relative overflow-hidden rounded-xl bg-emerald-50/20 border border-emerald-500/10 hover:ring-2 hover:ring-emerald-400/50 transition-all"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    </button>
                  );
                })}

                {/* Videos */}
                {videos.map((vid) => {
                  const url = getMediaPublicUrl(vid.storage_path);
                  const poster = vid.thumbnail
                    ? getMediaPublicUrl(vid.thumbnail)
                    : undefined;
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      onClick={() => setLightbox({ url, type: "video" })}
                      className="aspect-square relative overflow-hidden rounded-xl bg-emerald-900/10 border border-emerald-500/10 hover:ring-2 hover:ring-emerald-400/50 transition-all"
                    >
                      {poster ? (
                        <img src={poster} alt="" className="h-full w-full object-cover opacity-80" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-emerald-900/20">
                          <span className="text-xl">🎬</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 backdrop-blur-md text-white">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="m7 4 12 8-12 8V4z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
