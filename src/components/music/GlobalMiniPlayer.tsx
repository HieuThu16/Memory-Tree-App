"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useMusicStore } from "@/lib/stores/musicStore";
import { getSharedAudio } from "@/lib/music/sharedAudio";

export default function GlobalMiniPlayer() {
  const params = useParams<{ roomId?: string }>();

  const {
    playingUrl,
    currentTrackId,
    isPlaying,
    playlistTracks,
    playbackMode,
    syncMode,
    syncPartnerName,
    setPlayingState,
    playNext,
    playPrevious,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio and listeners
  useEffect(() => {
    const audio = getSharedAudio();
    audioRef.current = audio;

    const onPlay = () => setPlayingState(true);
    const onPause = () => setPlayingState(false);

    // Using an arrow function to grab the latest store state for handling "ended" easily
    const handleEnded = () => {
      const mode = useMusicStore.getState().playbackMode;
      const currentUrl = useMusicStore.getState().playingUrl;

      // If we are just playing a preview (not in playlist workflow)
      if (!useMusicStore.getState().currentTrackId) {
        useMusicStore.setState({ isPlaying: false, playingUrl: null });
        return;
      }

      if (mode === "off") {
        const state = useMusicStore.getState();
        if (state.currentTrackIndex >= state.playlistTracks.length - 1) {
          useMusicStore.setState({
            isPlaying: false,
            playingUrl: null,
            currentTrackId: null,
          });
          return;
        }
      }

      if (mode === "repeat-one" && currentUrl) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
      }

      // Default (shuffle or loop playlist)
      useMusicStore.getState().playNext();
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [setPlayingState]);

  // Sync URL changes to the actual audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingUrl && audio.src !== playingUrl) {
      audio.src = playingUrl;
      audio.play().catch(console.error);
    } else if (!playingUrl && !audio.paused) {
      audio.pause();
    }
  }, [playingUrl]);

  // Track metadata
  const currentTrack = currentTrackId
    ? playlistTracks.find((t) => t.id === currentTrackId)
    : null;

  if (!playingUrl) {
    return null;
  }

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  };

  return (
    <div className="fixed bottom-24 sm:bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-24px)] max-w-sm">
      <div className="glass-card flex items-center justify-between gap-3 p-3 px-4 rounded-full shadow-[0_12px_24px_-8px_rgba(84,67,148,0.3)] bg-white/90">
        {/* Track Info */}
        <div className="flex flex-1 min-w-0 flex-col justify-center">
          <p className="text-sm font-semibold text-foreground truncate">
            {currentTrack?.title || "Đang phát âm thanh..."}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 truncate">
            {currentTrack?.artist && (
              <p className="text-[10px] text-text-muted truncate">
                {currentTrack.artist}
              </p>
            )}
            {params?.roomId && (
              <>
                <span className="text-[10px] text-border">•</span>
                {syncMode === "shared" ? (
                  <button
                    // @ts-ignore
                    onClick={() => window.stopMusicSync?.()}
                    className="text-[9px] font-medium text-emerald-600 truncate flex items-center gap-0.5 hover:text-rose-500 transition-colors"
                    title="Nhấn để dừng nghe chung"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Nghe cùng {syncPartnerName || "người ấy"}
                  </button>
                ) : (
                  <button
                    // @ts-ignore
                    onClick={() => window.initiateMusicSync?.()}
                    className="text-[9px] font-medium text-accent hover:underline flex items-center gap-0.5"
                  >
                    🎧 Mời nghe chung
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 opacity-90">
          {currentTrackId && (
            <button
              onClick={playPrevious}
              className="p-1.5 rounded-full hover:bg-black/5 text-foreground transition-all"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="19 20 9 12 19 4 19 20" />
                <line x1="5" x2="5" y1="19" y2="5" />
              </svg>
            </button>
          )}

          <button
            onClick={togglePlayPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-md active:scale-95 transition-all"
          >
            {isPlaying ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="ml-0.5"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {currentTrackId && (
            <button
              onClick={playNext}
              className="p-1.5 rounded-full hover:bg-black/5 text-foreground transition-all"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" x2="19" y1="5" y2="19" />
              </svg>
            </button>
          )}

          <button
            onClick={() =>
              useMusicStore.setState({ playingUrl: null, currentTrackId: null })
            }
            className="p-1.5 text-text-muted ml-0.5 hover:bg-black/5 rounded-full"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
