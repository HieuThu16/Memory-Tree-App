"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MediaRecord } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function MemoryMediaDisplay({ media }: { media: MediaRecord[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Prevent background scroll when lightbox is open
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

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) => (i === 0 ? media.length - 1 : (i ?? 1) - 1));
      }
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) => (i === media.length - 1 ? 0 : (i ?? -1) + 1));
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, media.length]);

  if (!media || media.length === 0) return null;

  const getUrl = (path: string) => {
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const getGridCols = () => {
    if (media.length === 1) return "grid-cols-1";
    if (media.length === 2) return "grid-cols-2";
    if (media.length === 4) return "grid-cols-2";
    return "grid-cols-3"; // 3, 5, 6, 7+
  };

  return (
    <>
      {/* Inline Grid of Thumbnails */}
      <div className={`mt-3 grid gap-2 ${getGridCols()}`}>
        {media.map((item, idx) => {
          const url = getUrl(item.storage_path);
          return (
            <button
              key={item.id}
              type="button"
              className={`group relative overflow-hidden rounded-xl border border-border bg-black/5 transition hover:opacity-90 ${
                media.length === 1 ? "aspect-[4/3] sm:aspect-video w-full" : "aspect-square"
              }`}
              onClick={() => setLightboxIndex(idx)}
            >
              {item.media_type === "video" ? (
                <div className="h-full w-full">
                  <video
                    src={url}
                    className="h-full w-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9z"/></svg>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Media ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close Button */}
            <button
              className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              onClick={() => setLightboxIndex(null)}
            >
              ✕
            </button>

            {/* Main Content Area */}
            <div
              className="relative flex h-full w-full items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex h-full w-full max-w-5xl items-center justify-center">
                {media[lightboxIndex].media_type === "video" ? (
                  <video
                    src={getUrl(media[lightboxIndex].storage_path)}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
                    playsInline
                  />
                ) : (
                  <img
                    src={getUrl(media[lightboxIndex].storage_path)}
                    alt="Enlarged media"
                    className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl"
                  />
                )}
              </div>

              {/* Navigation Arrows */}
              {media.length > 1 && (
                <>
                  <div className="absolute inset-y-0 left-2 sm:left-6 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((i) => (i === 0 ? media.length - 1 : (i ?? 1) - 1));
                      }}
                      className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/30 hover:scale-110"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                      </svg>
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-2 sm:right-6 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((i) => (i === media.length - 1 ? 0 : (i ?? -1) + 1));
                      }}
                      className="group flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/30 hover:scale-110"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </>
              )}

              {/* Bottom Counter & Dots */}
              {media.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5 px-4">
                    {media.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === lightboxIndex
                            ? "w-4 bg-white opacity-100 shadow-sm"
                            : "w-1.5 bg-white/50 opacity-50"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold tracking-widest text-white backdrop-blur">
                    {lightboxIndex + 1} / {media.length}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
