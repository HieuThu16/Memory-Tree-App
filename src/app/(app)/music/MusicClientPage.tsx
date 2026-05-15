"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { RoomSummary } from "@/lib/types";

type LocalMusicTrack = {
  id: string;
  title: string;
  url: string;
};

export default function MusicClientPage({
  user,
  rooms,
  tracks,
}: {
  user: { id: string; displayName: string; avatarUrl: string | null };
  rooms: RoomSummary[];
  tracks: LocalMusicTrack[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(
    tracks[0]?.id ?? null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [search, setSearch] = useState("");
  const [volume, setVolume] = useState(0.85);

  const selectedRoom = rooms[0] ?? null;
  const filteredTracks = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return tracks;
    }

    return tracks.filter((track) =>
      track.title.toLowerCase().includes(keyword),
    );
  }, [search, tracks]);

  const activeTrack =
    tracks.find((track) => track.id === activeTrackId) ?? tracks[0] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    audio.src = activeTrack.url;
    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [activeTrack, isPlaying]);

  const playTrack = (track: LocalMusicTrack) => {
    setActiveTrackId(track.id);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    audio.pause();
    setIsPlaying(false);
  };

  const playNext = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex((track) => track.id === activeTrackId);
    const nextIndex = currentIndex >= tracks.length - 1 ? 0 : currentIndex + 1;
    setActiveTrackId(tracks[nextIndex]?.id ?? tracks[0].id);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (!tracks.length) return;
    const currentIndex = tracks.findIndex((track) => track.id === activeTrackId);
    const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
    setActiveTrackId(tracks[prevIndex]?.id ?? tracks[0].id);
    setIsPlaying(true);
  };

  return (
    <main className="px-3 pb-24 pt-3 sm:px-6 sm:pt-4">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground sm:text-lg">
              🎵 Nhạc local
            </h1>
            <span className="rounded-full border border-border bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-text-secondary">
              {tracks.length} bai hat
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            Xin chào, {user.displayName}
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="glass-card rounded-[28px] p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
              🎵
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              Chưa có khu vườn
            </p>
            <h2 className="mt-3 text-xl font-medium text-foreground">
              Tạo hoặc tham gia khu vườn trước
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Playlist nhạc được gắn theo từng khu vườn chung. Hãy tạo hoặc nhận
              lời mời vào khu vườn với bạn bè để bắt đầu nghe nhạc cùng nhau.
            </p>
            <Link
              href="/friends"
              className="btn-primary mt-5 inline-block px-6 py-3 text-sm"
            >
              Đến trang Bạn bè →
            </Link>
          </div>
        ) : null}

        <div className="glass-card rounded-[28px] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-white/85 px-3 py-1 text-xs font-semibold text-text-secondary">
              {selectedRoom ? `Phong: ${selectedRoom.name || "Khu vuon"}` : "Khong co phong"}
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tim bai hat..."
              className="input-field max-w-xs !rounded-xl !py-2 text-sm"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-white/70 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Danh sach nhac</h2>
                <span className="text-xs text-text-muted">{filteredTracks.length} bai</span>
              </div>

              <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {filteredTracks.map((track) => {
                  const isActive = track.id === activeTrack?.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => playTrack(track)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-white/80 text-text-secondary hover:border-accent/50"
                      }`}
                    >
                      <span className="truncate">{track.title}</span>
                      <span className="text-xs">{isActive && isPlaying ? "Dang phat" : "Phat"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white/75 p-4">
              <h2 className="text-sm font-semibold text-foreground">Trinh phat</h2>
              <p className="mt-1 truncate text-xs text-text-secondary">
                {activeTrack?.title ?? "Chua chon bai hat"}
              </p>

              <audio
                ref={audioRef}
                preload="none"
                onEnded={playNext}
                className="mt-3 w-full"
                controls
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={playPrev}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="btn-primary rounded-full px-4 py-1.5 text-xs"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={playNext}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary"
                >
                  Next
                </button>
              </div>

              <div className="mt-4">
                <label className="text-xs text-text-secondary">Volume</label>
                <input
                  type="range"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

