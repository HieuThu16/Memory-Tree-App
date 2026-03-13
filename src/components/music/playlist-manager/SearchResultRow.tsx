import type { MusicSearchResult } from "@/lib/types";
import { formatDuration } from "./formatters";
import HighlightedText from "./HighlightedText";
import SourceBadge from "./SourceBadge";

export default function SearchResultRow({
  track,
  searchQuery,
  onPlayPreview,
  isPlayingPreview,
  onOpenAddTrack,
}: {
  track: MusicSearchResult;
  searchQuery: string;
  onPlayPreview: (url: string) => void;
  isPlayingPreview: boolean;
  onOpenAddTrack: (track: MusicSearchResult) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 p-2.5">
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
        <HighlightedText
          text={track.title}
          query={searchQuery}
          className="block truncate text-sm font-semibold text-foreground"
        />
        <HighlightedText
          text={`${track.artist || "Không rõ nghệ sĩ"}${
            track.album ? ` · ${track.album}` : ""
          }`}
          query={searchQuery}
          className="block truncate text-xs text-text-secondary"
        />
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
            onClick={() => onPlayPreview(track.preview_url!)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/90 text-sm hover:border-accent hover:bg-accent/10"
            aria-label={isPlayingPreview ? "Dừng" : "Nghe thử"}
          >
            {isPlayingPreview ? "⏸" : "▶"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenAddTrack(track)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-accent/10 text-sm font-bold text-accent"
          aria-label="Chọn playlist để thêm bài"
          title="Chọn playlist để thêm bài"
        >
          +
        </button>
      </div>
    </div>
  );
}
