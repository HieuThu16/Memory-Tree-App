"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useMusicStore } from "@/lib/stores/musicStore";
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
import PlaybackModeButton from "./playlist-manager/PlaybackModeButton";
import SearchPanel from "./playlist-manager/SearchPanel";
import SearchResultRow from "./playlist-manager/SearchResultRow";
import TrackRow from "./playlist-manager/TrackRow";
import BackButton from "@/components/ui/BackButton";

type DiscoveryTab = "search" | "trending";
type TrendingCountry = "vn" | "us" | "kr" | "jp" | "gb";

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
  const [trendingResults, setTrendingResults] = useState<MusicSearchResult[]>(
    [],
  );
  const [activeDiscoveryTab, setActiveDiscoveryTab] =
    useState<DiscoveryTab>("search");
  const [trendingCountry, setTrendingCountry] = useState<TrendingCountry>("vn");
  const [isSearching, setIsSearching] = useState(false);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    playingUrl,
    currentTrackId,
    playbackMode,
    setPlaybackMode,
    playTrack,
    playPreview,
    playNext,
    playPrevious,
    setPlaylistTracks,
  } = useMusicStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [isPickPlaylistOpen, setIsPickPlaylistOpen] = useState(false);
  const [pendingTrackToAdd, setPendingTrackToAdd] =
    useState<MusicSearchResult | null>(null);
  const [selectedTargetPlaylistId, setSelectedTargetPlaylistId] = useState<
    string | null
  >(null);
  // Audio state is now global in useMusicStore

  const resolveFullTrackUrl = (
    track: MusicSearchResult | PlaylistTrackRecord,
  ) => {
    if (track.source === "youtube" && track.source_track_id) {
      if (track.source_track_id.startsWith("http")) {
        return `/api/music/play?url=${encodeURIComponent(track.source_track_id)}`;
      }
      return `/api/music/play?id=${track.source_track_id}`;
    }

    if (track.source === "jamendo" && track.preview_url) {
      return track.preview_url;
    }

    if (track.external_url) {
      return `/api/music/play?url=${encodeURIComponent(track.external_url)}`;
    }

    return track.preview_url ?? null;
  };

  const canPlayFullTrack = (track: MusicSearchResult | PlaylistTrackRecord) =>
    Boolean(resolveFullTrackUrl(track));

  const handlePlayFullTrack = (
    track: MusicSearchResult | PlaylistTrackRecord,
  ) => {
    const streamUrl = resolveFullTrackUrl(track);
    if (!streamUrl) {
      addToast("Bài này chưa có nguồn nghe full phù hợp.", "error");
      return;
    }

    if ("id" in track && track.id) {
      playTrack({ ...track, preview_url: streamUrl });
      return;
    }

    if (playingUrl === streamUrl && !currentTrackId) {
      playPreview(null);
      return;
    }

    playPreview(streamUrl);
  };

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

  const totalTracks = useMemo(
    () =>
      playlists.reduce(
        (sum, playlist) => sum + (playlist.tracks?.length ?? 0),
        0,
      ),
    [playlists],
  );

  const playableTracks = useMemo(
    () =>
      (selectedPlaylist?.tracks ?? []).filter((track) =>
        Boolean(track.preview_url),
      ),
    [selectedPlaylist],
  );

  useEffect(() => {
    setEditingName(selectedPlaylist?.name ?? "");
    setEditingDescription(selectedPlaylist?.description ?? "");
  }, [selectedPlaylist]);

  // Optional logic removed since global playback persists

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
            current.map((playlist) =>
              playlist.id === selectedPlaylistId
                ? {
                    ...playlist,
                    tracks: [
                      ...(playlist.tracks ?? []).filter(
                        (track) => track.id !== newTrack.id,
                      ),
                      newTrack,
                    ].sort((a, b) =>
                      a.position !== b.position
                        ? a.position - b.position
                        : a.created_at.localeCompare(b.created_at),
                    ),
                  }
                : playlist,
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
            current.map((playlist) =>
              playlist.id === selectedPlaylistId
                ? {
                    ...playlist,
                    tracks: (playlist.tracks ?? []).filter(
                      (track) => track.id !== deletedId,
                    ),
                  }
                : playlist,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedPlaylistId]);

  useEffect(() => {
    setPlaylistTracks(playableTracks);
  }, [playableTracks, setPlaylistTracks]);

  const handlePlayPreview = (url: string) => {
    if (playingUrl === url && !currentTrackId) {
      playPreview(null);
      return;
    }
    playPreview(url);
  };

  const handlePlayPlaylistTrack = (track: PlaylistTrackRecord) => {
    const streamUrl = resolveFullTrackUrl(track);
    if (!streamUrl) {
      addToast("Bài này hiện chưa có nguồn phát trực tiếp trong app.", "error");
      return;
    }
    if (currentTrackId === track.id && playingUrl === streamUrl) {
      playTrack(null);
      return;
    }
    playTrack({ ...track, preview_url: streamUrl });
  };

  const handlePlayPrevious = () => playPrevious();
  const handlePlayNext = () => playNext();

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
      setIsCreateModalOpen(false);
      addToast("Đã tạo playlist mới.", "success");
    });
  };

  const handleSavePlaylist = () => {
    if (!selectedPlaylist) return;

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
      setIsEditModalOpen(false);
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

  const fetchMusic = async (query: string) => {
    const response = await fetch(
      `/api/music/search?q=${encodeURIComponent(query.trim())}`,
    );

    if (!response.ok) {
      throw new Error("MUSIC_SEARCH_FAILED");
    }

    const payload = (await response.json()) as { data?: MusicSearchResult[] };
    return payload.data ?? [];
  };

  const fetchTrendingMusic = async (country: TrendingCountry) => {
    const response = await fetch(`/api/music/trending?country=${country}`);

    if (!response.ok) {
      throw new Error("MUSIC_TRENDING_FAILED");
    }

    const payload = (await response.json()) as { data?: MusicSearchResult[] };
    return payload.data ?? [];
  };

  const clearSearchResults = () => {
    if (activeDiscoveryTab === "trending") {
      setTrendingResults([]);
      return;
    }

    setSearchResults([]);
  };

  const visibleResults =
    activeDiscoveryTab === "trending" ? trendingResults : searchResults;

  const handleSearch = async (queryOverride?: string) => {
    const resolvedQuery = (queryOverride ?? searchQuery).trim();

    if (resolvedQuery.length < 2) {
      addToast("Nhập ít nhất 2 ký tự để tìm nhạc.", "error");
      return;
    }

    setSearchQuery(resolvedQuery);
    setIsSearching(true);

    try {
      const items = await fetchMusic(resolvedQuery);
      setSearchResults(items);
      setActiveDiscoveryTab("search");
    } catch {
      addToast("Không tìm được nhạc từ các nguồn hiện có.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadTrending = async () => {
    if (isTrendingLoading) {
      return;
    }

    setIsTrendingLoading(true);

    try {
      const items = await fetchTrendingMusic(trendingCountry);
      setTrendingResults(items);
      if (!isSearchResultsOpen) {
        setIsSearchResultsOpen(true);
      }
    } catch {
      addToast("Không tải được danh sách nhạc thịnh hành.", "error");
    } finally {
      setIsTrendingLoading(false);
    }
  };

  const handleSelectDiscoveryTab = (tab: DiscoveryTab) => {
    setActiveDiscoveryTab(tab);

    if (tab === "trending" && trendingResults.length === 0) {
      void handleLoadTrending();
    }
  };

  const handleTrendingCountryChange = (country: TrendingCountry) => {
    setTrendingCountry(country);
    setTrendingResults([]);

    if (activeDiscoveryTab === "trending") {
      void (async () => {
        if (isTrendingLoading) {
          return;
        }
        setIsTrendingLoading(true);
        try {
          const items = await fetchTrendingMusic(country);
          setTrendingResults(items);
        } catch {
          addToast("Không tải được danh sách nhạc thịnh hành.", "error");
        } finally {
          setIsTrendingLoading(false);
        }
      })();
    }
  };

  const handleOpenAddTrack = (track: MusicSearchResult) => {
    if (playlists.length === 0) {
      addToast("Bạn cần tạo playlist trước.", "error");
      return;
    }

    setPendingTrackToAdd(track);
    setSelectedTargetPlaylistId(selectedPlaylistId ?? playlists[0]?.id ?? null);
    setIsPickPlaylistOpen(true);
  };

  const handleAddTrackToPlaylist = (
    playlistId: string,
    track: MusicSearchResult,
  ) => {
    startTransition(async () => {
      const result = await addTrackToPlaylist(playlistId, track);

      if (result.error || !result.data) {
        addToast(result.error || "Không thể thêm bài vào playlist.", "error");
        return;
      }

      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.id === playlistId
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

      setSelectedPlaylistId(playlistId);
      setPendingTrackToAdd(null);
      setSelectedTargetPlaylistId(null);
      setIsPickPlaylistOpen(false);
      setSearchResults([]);
      setTrendingResults([]);
      setIsSearchResultsOpen(false);
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

  const renderSearchPanel = ({
    compact = false,
  }: { compact?: boolean } = {}) => (
    <SearchPanel
      compact={compact}
      activeTab={activeDiscoveryTab}
      searchQuery={searchQuery}
      isSearching={isSearching}
      visibleResults={visibleResults}
      isTrendingLoading={isTrendingLoading}
      onSearchQueryChange={setSearchQuery}
      onSearch={(override) => {
        void handleSearch(override);
      }}
      onSelectTab={handleSelectDiscoveryTab}
      onOpenCreateModal={() => {
        if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
        }
        setIsCreateModalOpen(true);
      }}
      onOpenSearchResults={() => setIsSearchResultsOpen(true)}
      onClearResults={clearSearchResults}
      onPlayPreview={handlePlayPreview}
      playingUrl={playingUrl}
      onOpenAddTrack={handleOpenAddTrack}
      onPlayFull={handlePlayFullTrack}
      canPlayFull={canPlayFullTrack}
      trendingCountry={trendingCountry}
      onTrendingCountryChange={handleTrendingCountryChange}
    />
  );

  return (
    <section className="flex flex-col gap-4">
      {(isPending || isSearching || isTrendingLoading) && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {isSearching
            ? "Đang tìm nhạc..."
            : isTrendingLoading
              ? "Đang tải nhạc thịnh hành..."
              : "Đang xử lý playlist..."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            🎵 Playlist
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {playlists.length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            🎧 Tổng Bài
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {totalTracks}
          </p>
        </div>
      </div>

      {renderSearchPanel()}

      <div className="flex flex-col gap-3">
        <p className="px-1 text-[10px] font-bold uppercase tracking-[0.32em] text-text-muted">
          Playlist của phòng ({playlists.length})
        </p>
        {playlists.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-white/60 p-5 text-center text-sm text-text-secondary">
            Chưa có playlist nào.
          </div>
        ) : (
          playlists.map((playlist) => (
            <div
              key={playlist.id}
              className={`w-full rounded-[22px] border px-4 py-3 transition-all ${
                playlist.id === selectedPlaylistId
                  ? "border-emerald-400 bg-emerald-50 shadow-[0_4px_16px_-8px_rgba(16,185,129,0.35)]"
                  : "border-border bg-white/70 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlaylistId(playlist.id);
                    setIsDetailModalOpen(true);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-foreground">
                    🎵 {playlist.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-text-secondary">
                    {playlist.description || "Chưa có mô tả"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    {(playlist.tracks ?? []).length} bài
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      setIsEditModalOpen(true);
                    }}
                    className="rounded-full border border-border p-1.5 text-text-muted hover:border-emerald-400 hover:text-emerald-700"
                    aria-label="Sửa playlist"
                    title="Sửa playlist"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="rounded-full border border-border p-1.5 text-text-muted hover:border-rose-400 hover:text-rose-500"
                    aria-label="Xóa playlist"
                    title="Xóa playlist"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateModalOpen && !isDetailModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Tạo playlist
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary"
              >
                Đóng
              </button>
            </div>
            <div className="grid gap-2">
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
                className="btn-primary mt-2 px-4 py-3 text-sm disabled:opacity-60"
              >
                {isPending ? "Đang tạo..." : "+ Tạo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditModalOpen && selectedPlaylist && !isDetailModalOpen ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Chỉnh sửa playlist
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-text-secondary"
              >
                Đóng
              </button>
            </div>
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
                rows={3}
                className="input-field resize-none !rounded-2xl !py-3 text-sm"
              />
              <button
                type="button"
                onClick={handleSavePlaylist}
                disabled={isPending}
                className="btn-primary mt-2 px-4 py-3 text-sm disabled:opacity-60"
              >
                {isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isPickPlaylistOpen && pendingTrackToAdd ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-white p-5">
            <p className="text-sm font-semibold text-foreground">
              Thêm &ldquo;{pendingTrackToAdd.title}&rdquo; vào playlist nào?
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {playlists.map((playlist) => {
                const isActive = selectedTargetPlaylistId === playlist.id;
                return (
                  <button
                    key={`pick-${playlist.id}`}
                    type="button"
                    onClick={() => setSelectedTargetPlaylistId(playlist.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                      isActive
                        ? "border-accent bg-accent/10"
                        : "border-border bg-white/80 hover:border-accent hover:bg-accent/5"
                    }`}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      🎵 {playlist.name}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {(playlist.tracks ?? []).length} bài
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!selectedTargetPlaylistId || isPending}
              onClick={() => {
                if (!selectedTargetPlaylistId || !pendingTrackToAdd) {
                  return;
                }
                handleAddTrackToPlaylist(
                  selectedTargetPlaylistId,
                  pendingTrackToAdd,
                );
              }}
              className="btn-primary mt-4 w-full px-3 py-2 text-sm disabled:opacity-60"
            >
              {isPending ? "Đang thêm..." : "OK"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPickPlaylistOpen(false);
                setPendingTrackToAdd(null);
                setSelectedTargetPlaylistId(null);
              }}
              className="mt-2 w-full rounded-full border border-border px-3 py-2 text-sm text-text-secondary"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : null}

      {isSearchResultsOpen ? (
        <div className="fixed inset-0 z-[80] h-[100dvh] w-screen overflow-hidden bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <BackButton onClick={() => setIsSearchResultsOpen(false)} />
              <p className="text-sm font-semibold text-foreground">
                {activeDiscoveryTab === "trending"
                  ? `Nhạc thịnh hành (${visibleResults.length})`
                  : `Tất cả kết quả tìm kiếm (${visibleResults.length})`}
              </p>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  activeDiscoveryTab === "trending"
                    ? "border border-rose-200 bg-rose-50 text-rose-600"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {activeDiscoveryTab === "trending"
                  ? "Tab: Thịnh hành"
                  : "Tab: Tìm kiếm"}
              </span>
            </div>

            <div className="flex-1 touch-pan-y overflow-y-auto px-4 pb-6 pt-4">
              <div className="space-y-2">
                {visibleResults.map((track) => (
                  <SearchResultRow
                    key={`all-${track.source}-${track.source_track_id}`}
                    track={track}
                    searchQuery={searchQuery}
                    onPlayPreview={handlePlayPreview}
                    isPlayingPreview={playingUrl === track.preview_url}
                    onOpenAddTrack={handleOpenAddTrack}
                    onPlayFull={handlePlayFullTrack}
                    canPlayFull={canPlayFullTrack(track)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDetailModalOpen && selectedPlaylist ? (
        <div className="fixed inset-0 z-[80] h-[100dvh] w-screen overflow-hidden bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <BackButton onClick={() => setIsDetailModalOpen(false)} />
              <p className="truncate px-3 text-sm font-semibold text-foreground">
                🎵 {selectedPlaylist.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsEditModalOpen(true);
                }}
                className="rounded-full border border-border p-2 text-text-secondary"
                title="Sửa playlist"
              >
                ✏️
              </button>
            </div>

            <div className="flex-1 touch-pan-y overflow-y-auto px-4 pb-6 pt-4">
              <div className="sticky top-0 z-20 -mx-4 bg-white px-4 pb-3">
                {renderSearchPanel({ compact: true })}
              </div>

              <p className="text-xs text-text-secondary">
                {(selectedPlaylist.tracks ?? []).length} bài trong playlist
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePlayPrevious}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary"
                >
                  ⏮ Prev
                </button>
                <button
                  type="button"
                  onClick={handlePlayNext}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary"
                >
                  Next ⏭
                </button>
                <PlaybackModeButton
                  active={playbackMode === "off"}
                  onClick={() => setPlaybackMode("off")}
                  label="Phát thường"
                />
                <PlaybackModeButton
                  active={playbackMode === "repeat-one"}
                  onClick={() => setPlaybackMode("repeat-one")}
                  label="Lặp 1"
                />
                <PlaybackModeButton
                  active={playbackMode === "repeat-all"}
                  onClick={() => setPlaybackMode("repeat-all")}
                  label="Lặp playlist"
                />
                <PlaybackModeButton
                  active={playbackMode === "shuffle"}
                  onClick={() => setPlaybackMode("shuffle")}
                  label="Random"
                />
              </div>

              {(selectedPlaylist.tracks ?? []).length === 0 ? (
                <p className="mt-4 text-sm text-text-secondary">
                  Playlist này chưa có bài nào.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {selectedPlaylist.tracks?.map((track, index) => (
                    <TrackRow
                      key={`detail-${track.id}`}
                      track={track}
                      index={index}
                      isPlaying={currentTrackId === track.id}
                      onPlayTrack={handlePlayPlaylistTrack}
                      onPlayFull={handlePlayFullTrack}
                      canPlayFull={canPlayFullTrack(track)}
                      onRemove={handleRemoveTrack}
                      isPending={isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
