"use client";

import { useState } from "react";
import Link from "next/link";
import type { MemoryRecord, MediaRecord } from "@/lib/types";
import { getMediaPublicUrl } from "@/lib/media";

function isImage(m: MediaRecord) {
  const t = m.media_type?.toLowerCase() ?? "";
  return !t || t === "image" || t.startsWith("image/");
}

function isVideo(m: MediaRecord) {
  const t = m.media_type?.toLowerCase() ?? "";
  return t === "video" || t.startsWith("video/");
}

/* ── Lightbox (full-screen viewer + download) ── */
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
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={handleDownload}
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

export default function TimelineMonthClient({
  memories,
  roomId,
  year,
  month,
}: {
  memories: MemoryRecord[];
  roomId: string;
  year: number;
  month: number;
}) {
  const [lightbox, setLightbox] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);

  if (memories.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-white/40 border border-white/60 text-sm text-emerald-700/60 font-medium shadow-sm backdrop-blur-sm mt-2">
        Không có kỉ niệm nào trong tháng này.
      </div>
    );
  }

  return (
    <>
      {lightbox && (
        <Lightbox
          url={lightbox.url}
          type={lightbox.type}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="relative mt-2 pt-2">
        {/* Vertical timeline line */}
        <div className="absolute inset-y-0 left-[36px] w-[3px] rounded-full bg-gradient-to-b from-emerald-400/30 via-emerald-300/20 to-transparent sm:left-[44px]" />

        <div className="flex flex-col gap-5 pb-12">
          {memories.map((memory) => {
            const dateObj = new Date(memory.date || memory.created_at);
            const day = dateObj.getDate();
            const allMedia = memory.media ?? [];
            const images = allMedia.filter(isImage);
            const videos = allMedia.filter(isVideo);

            return (
              <div
                key={memory.id}
                className="relative flex items-start gap-4 sm:gap-6"
              >
                {/* Left: Date circle */}
                <div className="relative z-10 flex h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl sm:rounded-3xl border-[3px] border-[#f6f0e7] bg-gradient-to-br from-emerald-100 to-teal-50 shadow-md ml-1 sm:ml-2">
                  <span className="text-xl sm:text-2xl font-black leading-none text-emerald-700">
                    {day}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-600/70 mt-0.5">
                    Thg {month}
                  </span>
                </div>

                {/* Right: Content Card */}
                <div className="flex-1 min-w-0 overflow-hidden rounded-2xl sm:rounded-[24px] border border-white/60 bg-white/70 shadow-sm backdrop-blur-md">
                  {/* Text content FIRST */}
                  <Link
                    href={`/friends/${roomId}/timeline/${year}/${month}/${memory.id}`}
                    className="block p-3.5 sm:p-4 hover:bg-white/40 transition-colors"
                  >
                    <h3 className="text-[14px] sm:text-[16px] font-extrabold text-emerald-950 leading-snug">
                      {memory.title}
                    </h3>

                    {memory.content && (
                      <p className="mt-1.5 text-[12px] sm:text-[13px] text-emerald-800/70 leading-relaxed line-clamp-2">
                        {memory.content}
                      </p>
                    )}

                    {/* Tags */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700/55">
                      {memory.location && (
                        <span className="flex items-center gap-1 bg-emerald-50/60 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                          📍 {memory.location}
                        </span>
                      )}
                      {memory.with_whom && (
                        <span className="flex items-center gap-1 bg-emerald-50/60 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                          👥 {memory.with_whom}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Media Gallery SECOND (Thumbnails) */}
                  {(images.length > 0 || videos.length > 0) && (
                    <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4">
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                        {/* Images */}
                        {images.map((img) => {
                          const url = getMediaPublicUrl(img.storage_path);
                          return (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setLightbox({ url, type: "image" })}
                              className="aspect-square relative overflow-hidden rounded-lg bg-emerald-50/20 border border-emerald-500/5 hover:ring-2 hover:ring-emerald-400/30 transition-all"
                            >
                              <img
                                src={url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
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
                              className="aspect-square relative overflow-hidden rounded-lg bg-emerald-900/10 border border-emerald-500/5 hover:ring-2 hover:ring-emerald-400/30 transition-all"
                            >
                              {poster ? (
                                <img src={poster} alt="" className="h-full w-full object-cover opacity-80" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <span className="text-xs">🎬</span>
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/40 backdrop-blur-sm text-[8px] text-white">
                                  ▶
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
            );
          })}
        </div>
      </div>
    </>
  );
}
