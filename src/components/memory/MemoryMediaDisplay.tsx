"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MediaRecord } from "@/lib/types";
import { getMediaDownloadName, getMediaPublicUrl } from "@/lib/media";
import { useUiStore } from "@/lib/stores/uiStore";

type ResolvedMediaItem = MediaRecord & {
  url: string;
  thumbnailUrl?: string;
};

export default function MemoryMediaDisplay({
  media,
}: {
  media: MediaRecord[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  const mediaItems = useMemo<ResolvedMediaItem[]>(
    () =>
      media.map((item) => ({
        ...item,
        url: getMediaPublicUrl(item.storage_path),
        thumbnailUrl: item.thumbnail
          ? getMediaPublicUrl(item.thumbnail)
          : undefined,
      })),
    [media],
  );

  const activeItem =
    lightboxIndex !== null ? (mediaItems[lightboxIndex] ?? null) : null;

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLightboxIndex(null);
      }

      if (event.key === "ArrowLeft") {
        setLightboxIndex((index) =>
          index === 0 ? mediaItems.length - 1 : (index ?? 1) - 1,
        );
      }

      if (event.key === "ArrowRight") {
        setLightboxIndex((index) =>
          index === mediaItems.length - 1 ? 0 : (index ?? -1) + 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, mediaItems.length]);

  if (!mediaItems.length) return null;

  const handleDownload = async () => {
    if (!activeItem || isDownloading) return;

    setIsDownloading(true);

    try {
      const response = await fetch(activeItem.url, { cache: "force-cache" });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getMediaDownloadName(
        activeItem.storage_path,
        activeItem.media_type,
      );
      link.click();

      window.URL.revokeObjectURL(objectUrl);
      addToast("Da tai media xuong may.", "success");
    } catch (error) {
      console.error("Failed to download media", error);
      window.open(activeItem.url, "_blank", "noopener,noreferrer");
      addToast("Khong tai blob duoc, da mo media trong tab moi.", "info");
    } finally {
      setIsDownloading(false);
    }
  };

  const getGridCols = () => {
    if (mediaItems.length === 1) return "grid-cols-1";
    if (mediaItems.length === 2) return "grid-cols-2";
    if (mediaItems.length === 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <>
      <div className={`mt-3 grid gap-2 ${getGridCols()}`}>
        {mediaItems.map((item, idx) => {
          const singleItem = mediaItems.length === 1;

          return (
            <button
              key={item.id}
              type="button"
              className={`group relative overflow-hidden rounded-xl border border-border bg-slate-950/4 transition hover:opacity-90 ${
                singleItem
                  ? "aspect-[4/3] w-full sm:aspect-video"
                  : "aspect-[4/5]"
              }`}
              onClick={() => setLightboxIndex(idx)}
            >
              {item.media_type === "video" ? (
                <div className="h-full w-full">
                  <video
                    src={item.url}
                    className="h-full w-full object-contain p-1.5"
                    poster={item.thumbnailUrl}
                    preload="none"
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M5 3l14 9-14 9z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`Media ${idx + 1}`}
                  className="h-full w-full object-contain p-1.5"
                  loading={idx < 2 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={idx === 0 ? "high" : "low"}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && activeItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-[6.5rem] items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDownload();
                }}
                disabled={isDownloading}
              >
                {isDownloading ? "Dang tai..." : "Tai xuong"}
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
                onClick={() => setLightboxIndex(null)}
              >
                x
              </button>
            </div>

            <div
              className="relative flex h-full w-full items-center justify-center p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative flex h-full w-full max-w-5xl items-center justify-center">
                {activeItem.media_type === "video" ? (
                  <video
                    src={activeItem.url}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
                    playsInline
                    poster={activeItem.thumbnailUrl}
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={activeItem.url}
                    alt="Enlarged media"
                    className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                )}
              </div>

              {mediaItems.length > 1 ? (
                <>
                  <div className="absolute inset-y-0 left-2 flex items-center sm:left-6">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightboxIndex((index) =>
                          index === 0 ? mediaItems.length - 1 : (index ?? 1) - 1,
                        );
                      }}
                      className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:scale-110 hover:bg-white/30"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-2 flex items-center sm:right-6">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightboxIndex((index) =>
                          index === mediaItems.length - 1 ? 0 : (index ?? -1) + 1,
                        );
                      }}
                      className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:scale-110 hover:bg-white/30"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : null}

              {mediaItems.length > 1 ? (
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5 px-4">
                    {mediaItems.map((_, index) => (
                      <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === lightboxIndex
                            ? "w-4 bg-white opacity-100 shadow-sm"
                            : "w-1.5 bg-white/50 opacity-50"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tracking-widest text-white backdrop-blur">
                    {lightboxIndex + 1} / {mediaItems.length}
                  </span>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
