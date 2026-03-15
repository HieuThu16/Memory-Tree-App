import { useState, useEffect, useRef } from "react";
import type { MusicSearchResult } from "@/lib/types";
import SearchResultRow from "./SearchResultRow";

type DiscoveryTab = "search" | "trending";
type TrendingCountry = "vn" | "us" | "kr" | "jp" | "gb";

export default function SearchPanel({
  activeTab,
  searchQuery,
  isSearching,
  visibleResults,
  isTrendingLoading,
  onSearchQueryChange,
  onSearch,
  onSelectTab,
  onOpenCreateModal,
  onOpenSearchResults,
  onClearResults,
  onPlayPreview,
  playingUrl,
  onOpenAddTrack,
  onPlayFull,
  canPlayFull,
  trendingCountry,
  onTrendingCountryChange,
  compact,
}: {
  activeTab: DiscoveryTab;
  searchQuery: string;
  isSearching: boolean;
  visibleResults: MusicSearchResult[];
  isTrendingLoading: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: (override?: string) => void;
  onSelectTab: (tab: DiscoveryTab) => void;
  onOpenCreateModal: () => void;
  onOpenSearchResults: () => void;
  onClearResults: () => void;
  onPlayPreview: (url: string) => void;
  playingUrl: string | null;
  onOpenAddTrack: (track: MusicSearchResult) => void;
  onPlayFull: (track: MusicSearchResult) => void;
  canPlayFull: (track: MusicSearchResult) => boolean;
  trendingCountry: TrendingCountry;
  onTrendingCountryChange: (country: TrendingCountry) => void;
  compact?: boolean;
}) {
  const previewSearchRows = visibleResults.slice(0, 5);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("musicRecentSearches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hide suggestions when results arrive
  useEffect(() => {
    if (visibleResults.length > 0) {
      setShowSuggestions(false);
    }
  }, [visibleResults]);

  const handleExecuteSearch = (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;
    const newRecent = [
      queryToSearch.trim(),
      ...recentSearches.filter(
        (s) => s.toLowerCase() !== queryToSearch.trim().toLowerCase(),
      ),
    ].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem("musicRecentSearches", JSON.stringify(newRecent));
    setShowSuggestions(false);
    onSearch(queryToSearch);
  };

  const handleClearRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem("musicRecentSearches");
    setShowSuggestions(false);
  };

  return (
    <div
      className={`relative z-30 glass-card rounded-[24px] p-4 ${
        compact ? "mt-0" : ""
      }`}
    >
      <div className="mb-3 inline-flex w-full rounded-2xl border border-border bg-white/70 p-1">
        <button
          type="button"
          onClick={() => onSelectTab("search")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "search"
              ? "bg-emerald-600 text-white"
              : "text-text-secondary hover:bg-emerald-50"
          }`}
        >
          🔎 Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => onSelectTab("trending")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            activeTab === "trending"
              ? "bg-emerald-600 text-white"
              : "text-text-secondary hover:bg-emerald-50"
          }`}
        >
          🔥 Thịnh hành
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div ref={searchContainerRef} className="relative isolate flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleExecuteSearch(searchQuery);
              }
            }}
            placeholder="Ví dụ: bùi, Sơn Tùng, Lạc Trôi..."
            className="input-field w-full !rounded-2xl !py-3 text-sm disabled:opacity-60"
            disabled={activeTab === "trending"}
          />

          {/* Suggestions Dropdown */}
          {showSuggestions &&
            activeTab === "search" &&
            recentSearches.length > 0 && (
              <div className="absolute top-[110%] left-0 right-0 z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-lg fade-in">
                <div className="flex items-center justify-between border-b border-border/50 bg-gray-50/50 px-3 py-2 text-xs text-text-muted">
                  <span className="font-medium">Tìm kiếm gần đây</span>
                  <button
                    type="button"
                    onClick={handleClearRecent}
                    className="font-semibold text-rose-500 hover:text-rose-600 hover:underline"
                  >
                    Xoá lịch sử
                  </button>
                </div>
                <ul className="max-h-60 overflow-y-auto w-full">
                  {recentSearches.map((term, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => {
                          onSearchQueryChange(term);
                          handleExecuteSearch(term);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-emerald-50 hover:text-emerald-700 focus:bg-emerald-50 focus:outline-none transition-colors"
                      >
                        <span className="text-text-muted">🕒</span>
                        <span className="truncate">{term}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        <button
          type="button"
          onClick={() => handleExecuteSearch(searchQuery)}
          disabled={isSearching || activeTab === "trending"}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-600 text-white disabled:opacity-60"
          aria-label="Tìm"
        >
          {isSearching ? "…" : "🔍"}
        </button>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-600 p-0 text-xl text-white"
          aria-label="Tạo playlist"
          title="Tạo playlist"
        >
          +
        </button>
      </div>

      {activeTab === "trending" ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-text-secondary">Quốc gia thịnh hành</p>
          <select
            value={trendingCountry}
            onChange={(event) =>
              onTrendingCountryChange(event.target.value as TrendingCountry)
            }
            className="rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="vn">Việt Nam</option>
            <option value="us">Mỹ</option>
            <option value="kr">Hàn Quốc</option>
            <option value="jp">Nhật Bản</option>
            <option value="gb">Anh</option>
          </select>
        </div>
      ) : null}

      {activeTab === "trending" && isTrendingLoading ? (
        <p className="mt-2 text-xs font-medium text-text-secondary">
          Đang tải danh sách thịnh hành...
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-end gap-2">
        {visibleResults.length > 0 ? (
          <button
            type="button"
            onClick={onClearResults}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-rose-300 hover:text-rose-500"
          >
            Xóa kết quả
          </button>
        ) : null}
      </div>

      {visibleResults.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-border bg-white/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">
              {activeTab === "trending"
                ? `Đang hiển thị ${visibleResults.length} bài thịnh hành.`
                : `Tìm thấy ${visibleResults.length} kết quả.`}
            </p>
            <button
              type="button"
              onClick={onOpenSearchResults}
              className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Xem tất cả kết quả
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {previewSearchRows.map((track) => (
              <SearchResultRow
                key={`${track.source}-${track.source_track_id}`}
                track={track}
                searchQuery={searchQuery}
                onPlayPreview={onPlayPreview}
                isPlayingPreview={playingUrl === track.preview_url}
                onOpenAddTrack={onOpenAddTrack}
                onPlayFull={onPlayFull}
                canPlayFull={canPlayFull(track)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
