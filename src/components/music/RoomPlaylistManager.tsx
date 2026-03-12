"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  MusicSearchResult,
  PlaylistRecord,
  PlaylistTrackRecord,
} from "@/lib/types";
import {
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
  updatePlaylist,
} from "@/lib/actions";
import { useUiStore } from "@/lib/stores/uiStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function formatDuration(durationMs: number | null) {
  if (!durationMs) return "--:--";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isRecentlyAdded(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  itunes: { label: "iTunes", color: "bg-sky-100 text-sky-700" },
  deezer: { label: "Deezer", color: "bg-purple-100 text-purple-700" },
  jamendo: { label: "Jamendo", color: "bg-green-100 text-green-700" },
};

function SourceBadge({ source }: { source: string }) {
  const meta = SOURCE_LABELS[source] ?? {
    label: source,
    color: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}

export default function RoomPlaylistManager({
  roomId,
  initialPlaylists,
}: {
  roomId: string;
  initialPlaylists: PlaylistRecord[];
}) {
  const addToast = useUiStore((state) => state.addToast);
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    initialPlaylists[0]?.id ?? null,
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setPlaylists(initialPlaylists);
    setSelectedPlaylistId(initialPlaylists[0]?.id ?? null);
  }, [initialPlaylists]);

  useEffect(() => {
    if (!selectedPlaylistId && playlists[0]?.id) {
      setSelectedPlaylistId(playlists[0].id);
    }
  }, [playlists, selectedPlaylistId]);

  const selectedPlaylist = useMemo(
    () =>
      playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  useEffect(() => {
    setEditingName(selectedPlaylist?.name ?? "");
    setEditingDescription(selectedPlaylist?.description ?? "");
  }, [selectedPlaylist]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlaylistId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`playlist_tracks:${selectedPlaylistId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "playlist_tracks",
          filter: `playlist_id=eq.${selectedPlaylistId}`,
        },
        (payload) => {
          const newTrack = payload.new as PlaylistTrackRecord;
          setPlaylists((current) =>
            current.map((p) =>
              p.id === selectedPlaylistId
                ? {
                    ...p,
                    tracks: [
                      ...(p.tracks ?? []).filter((t) => t.id !== newTrack.id),
                      newTrack,
                    ].sort((a, b) =>
                      a.position !== b.position
                        ? a.position - b.position
                        : a.created_at.localeCompare(b.created_at),
                    ),
                  }
                : p,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "playlist_tracks",
          filter: `playlist_id=eq.${selectedPlaylistId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setPlaylists((current) =>
            current.map((p) => ({
              ...p,
              tracks: (p.tracks ?? []).filter((t) => t.id !== deletedId),
            })),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedPlaylistId]);

  // ── Audio preview ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.addEventListener("ended", () => setPlayingUrl(null));
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const handlePlayPreview = (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingUrl === url) {
      audio.pause();
      setPlayingUrl(null);
    } else {
      audio.src = url;
      audio.play().catch(() => addToast("Không thể phát preview.", "error"));
      setPlayingUrl(url);
    }
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      addToast("Nhập tên playlist trước khi tạo.", "error");
      return;
    }

    startTransition(async () => {
      const result = await createPlaylist({
        roomId,
        name: newPlaylistName,
        description: newPlaylistDescription,
      });

      if (result.error || !result.data) {
        addToast(result.error || "Không thể tạo playlist.", "error");
        return;
      }

      setPlaylists((current) => [result.data, ...current]);
      setSelectedPlaylistId(result.data.id);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      addToast("Đã tạo playlist mới.", "success");
    });
  };

  const handleSavePlaylist = () => {
    if (!selectedPlaylist) {
      return;
    }

    startTransition(async () => {
      const result = await updatePlaylist(selectedPlaylist.id, {
        name: editingName,
        description: editingDescription,
      });

      if (result.error || !result.data) {
        addToast(result.error || "Không thể cập nhật playlist.", "error");
        return;
      }

      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === result.data.id ? result.data : playlist,
        ),
      );
      addToast("Đã cập nhật playlist.", "success");
    });
  };

  const handleDeletePlaylist = (playlistId: string) => {
    if (!confirm("Xóa playlist này?")) {
      return;
    }

    startTransition(async () => {
      const result = await deletePlaylist(playlistId);

      if (result.error) {
        addToast(result.error, "error");
        return;
      }

      setPlaylists((current) =>
        current.filter((playlist) => playlist.id !== playlistId),
      );
      setSelectedPlaylistId((current) =>
        current === playlistId ? null : current,
      );
      addToast("Đã xóa playlist.", "success");
    });
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      addToast("Nhập ít nhất 2 ký tự để tìm nhạc.", "error");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      const payload = (await response.json()) as { data?: MusicSearchResult[] };
      setSearchResults(payload.data ?? []);
    } catch {
      addToast("Không tìm được nhạc từ các nguồn hiện có.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTrack = (track: MusicSearchResult) => {
    if (!selectedPlaylist) {
      addToast("Tạo playlist trước rồi hãy thêm bài.", "error");
      return;
    }

    startTransition(async () => {
      const result = await addTrackToPlaylist(selectedPlaylist.id, track);

      if (result.error || !result.data) {
        addToast(result.error || "Không thể thêm bài vào playlist.", "error");
        return;
      }

      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === selectedPlaylist.id
            ? {
                ...playlist,
                tracks: [
                  ...(playlist.tracks ?? []).filter(
                    (existing) => existing.id !== result.data!.id,
                  ),
                  result.data!,
                ].sort((left, right) => left.position - right.position),
              }
            : playlist,
        ),
      );
      addToast("Đã thêm bài vào playlist.", "success");
    });
  };

  const handleRemoveTrack = (trackId: string) => {
    startTransition(async () => {
      const result = await removeTrackFromPlaylist(trackId);

      if (result.error) {
        addToast(result.error, "error");
        return;
      }

      setPlaylists((current) =>
        current.map((playlist) => ({
          ...playlist,
          tracks: (playlist.tracks ?? []).filter(
            (track) => track.id !== trackId,
          ),
        })),
      );
      addToast("Đã bỏ bài khỏi playlist.", "success");
    });
  };

  return (
    <section className="flex flex-col gap-5">
      {/* Create playlist */}
      <div className="glass-card rounded-[28px] p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent">
          Tạo playlist mới
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
            placeholder="Tên playlist..."
            className="input-field !rounded-2xl !py-3 text-sm"
          />
          <input
            type="text"
            value={newPlaylistDescription}
            onChange={(e) => setNewPlaylistDescription(e.target.value)}
            placeholder="Mood, chủ đề, khoảnh khắc..."
            className="input-field !rounded-2xl !py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleCreatePlaylist}
            disabled={isPending}
            className="btn-primary whitespace-nowrap px-5 py-3 text-sm disabled:opacity-60"
          >
            + Tạo
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Playlist list */}
        <div className="flex flex-col gap-3">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.32em] text-text-muted">
            Danh sách ({playlists.length})
          </p>
          {playlists.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border bg-white/60 p-5 text-center text-sm text-text-secondary">
              Chưa có playlist nào.
              <br />
              Tạo playlist đầu tiên bên trên nhé.
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => setSelectedPlaylistId(playlist.id)}
                className={`w-full rounded-[22px] border px-4 py-3 text-left transition-all ${
                  playlist.id === selectedPlaylistId
                    ? "border-accent bg-accent/10 shadow-[0_4px_16px_-8px_rgba(108,76,215,0.3)]"
                    : "border-border bg-white/70 hover:border-accent/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      🎵 {playlist.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">
                      {playlist.description || "Chưa có mô tả"}
                    </p>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      {(playlist.tracks ?? []).length} bài
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] text-text-muted hover:border-rose-400 hover:text-rose-500"
                  >
                    Xóa
                  </button>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Edit selected playlist */}
          {selectedPlaylist ? (
            <div className="glass-card rounded-[24px] p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-text-muted">
                Thông tin playlist đang chọn
              </p>
              <div className="grid gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  aria-label="Tên playlist"
                  placeholder="Tên playlist"
                  className="input-field !rounded-2xl !py-3 text-sm"
                />
                <textarea
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  aria-label="Mô tả playlist"
                  placeholder="Mô tả playlist"
                  rows={2}
                  className="input-field resize-none !rounded-2xl !py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSavePlaylist}
                  disabled={isPending}
                  className="btn-secondary px-4 py-3 text-sm disabled:opacity-60"
                >
                  Lưu thông tin
                </button>
              </div>
            </div>
          ) : null}

          {/* Search */}
          <div className="glass-card rounded-[24px] p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-text-muted">
              Tìm nhạc · iTunes · Deezer · Jamendo
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
                placeholder="Tên bài hát, nghệ sĩ, album..."
                className="input-field flex-1 !rounded-2xl !py-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={isSearching}
                className="btn-primary px-5 py-3 text-sm disabled:opacity-60"
              >
                {isSearching ? "Đang tìm..." : "Tìm"}
              </button>
            </div>

            {searchResults.length > 0 ? (
              <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {searchResults.map((track) => (
                  <div
                    key={`${track.source}-${track.source_track_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 p-2.5"
                  >
                    {track.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.artwork_url}
                        alt={track.title}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {track.artist || "Không rõ nghệ sĩ"}
                        {track.album ? ` · ${track.album}` : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <SourceBadge source={track.source} />
                        <span className="text-[11px] text-text-muted">
                          {formatDuration(track.duration_ms)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {track.preview_url ? (
                        <button
                          type="button"
                          onClick={() => handlePlayPreview(track.preview_url!)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/80 text-sm hover:border-accent hover:bg-accent/10"
                          aria-label={
                            playingUrl === track.preview_url
                              ? "Dừng"
                              : "Nghe thử"
                          }
                        >
                          {playingUrl === track.preview_url ? "⏸" : "▶"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleAddTrack(track)}
                        disabled={!selectedPlaylist || isPending}
                        className="btn-secondary px-3 py-1.5 text-[11px] disabled:opacity-50"
                      >
                        + Thêm
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Tracks in selected playlist */}
          {selectedPlaylist ? (
            <div className="glass-card rounded-[24px] p-4">
              <div className="mb-3 flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-text-muted">
                  Bài trong &ldquo;{selectedPlaylist.name}&rdquo; ·{" "}
                  {(selectedPlaylist.tracks ?? []).length} bài
                </p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                  ● realtime
                </span>
              </div>
              {(selectedPlaylist.tracks ?? []).length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Playlist này chưa có bài nào. Tìm và thêm nhạc bên trên!
                </p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {selectedPlaylist.tracks?.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      isPlaying={playingUrl === track.preview_url}
                      onPlay={handlePlayPreview}
                      onRemove={handleRemoveTrack}
                      isPending={isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-white/50 p-6 text-center text-sm text-text-secondary">
              Chọn một playlist bên trái để xem và quản lý bài hát.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrackRow({
  track,
  index,
  isPlaying,
  onPlay,
  onRemove,
  isPending,
}: {
  track: PlaylistTrackRecord;
  index: number;
  isPlaying: boolean;
  onPlay: (url: string) => void;
  onRemove: (id: string) => void;
  isPending: boolean;
}) {
  const isNew = isRecentlyAdded(track.created_at);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all ${
        isNew
          ? "border-accent/40 bg-accent/5 shadow-[0_2px_12px_-6px_rgba(108,76,215,0.25)]"
          : "border-border bg-white/80"
      }`}
    >
      <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-text-muted">
        {index + 1}
      </span>
      {track.artwork_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.artwork_url}
          alt={track.title}
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-lg">
          🎵
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {track.title}
          </p>
          {isNew ? (
            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Mới
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-text-secondary">
          {track.artist || "Không rõ nghệ sĩ"}
          {track.album ? ` · ${track.album}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <SourceBadge source={track.source} />
          <span className="text-[11px] text-text-muted">
            {formatDuration(track.duration_ms)}
          </span>
          {track.external_url ? (
            <a
              href={track.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-accent hover:underline"
            >
              Mở ↗
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {track.preview_url ? (
          <button
            type="button"
            onClick={() => onPlay(track.preview_url!)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-all ${
              isPlaying
                ? "border-accent bg-accent text-white shadow-[0_4px_12px_-4px_rgba(108,76,215,0.5)]"
                : "border-border bg-white/80 hover:border-accent hover:bg-accent/10"
            }`}
            aria-label={isPlaying ? "Dừng" : "Nghe thử"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(track.id)}
          disabled={isPending}
          className="rounded-full border border-border px-2 py-1 text-[10px] text-text-muted hover:border-rose-400 hover:text-rose-500 disabled:opacity-50"
        >
          Bỏ
        </button>
      </div>
    </div>
  );
}
