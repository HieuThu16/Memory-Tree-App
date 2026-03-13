import type { MusicSearchResult } from "@/lib/types";
import SearchResultRow from "./SearchResultRow";

export default function SearchPanel({
  searchQuery,
  isSearching,
  searchResults,
  onSearchQueryChange,
  onSearch,
  onOpenCreateModal,
  onOpenSearchResults,
  onPlayPreview,
  playingUrl,
  onOpenAddTrack,
  compact,
}: {
  searchQuery: string;
  isSearching: boolean;
  searchResults: MusicSearchResult[];
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onOpenCreateModal: () => void;
  onOpenSearchResults: () => void;
  onPlayPreview: (url: string) => void;
  playingUrl: string | null;
  onOpenAddTrack: (track: MusicSearchResult) => void;
  compact?: boolean;
}) {
  const previewSearchRows = searchResults.slice(0, 5);

  return (
    <div
      className={`relative z-30 glass-card rounded-[24px] p-4 ${
        compact ? "mt-0" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="relative isolate flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Ví dụ: bùi, Sơn Tùng, Lạc Trôi..."
            className="input-field w-full !rounded-2xl !py-3 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={onSearch}
          disabled={isSearching}
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

      {searchResults.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-border bg-white/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">
              Tìm thấy {searchResults.length} kết quả.
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
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
