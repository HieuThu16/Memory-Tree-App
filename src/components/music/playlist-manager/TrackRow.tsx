import type { PlaylistTrackRecord } from "@/lib/types";
import { formatDuration, isRecentlyAdded } from "./formatters";
import SourceBadge from "./SourceBadge";

export default function TrackRow({
  track,
  index,
  isPlaying,
  onPlayTrack,
  onPlayFull,
  canPlayFull,
  onRemove,
  isPending,
}: {
  track: PlaylistTrackRecord;
  index: number;
  isPlaying: boolean;
  onPlayTrack: (track: PlaylistTrackRecord) => void;
  onPlayFull: (track: PlaylistTrackRecord) => void;
  canPlayFull: boolean;
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
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {canPlayFull ? (
          <button
            type="button"
            onClick={() => onPlayFull(track)}
            className="rounded-full border border-accent bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent"
            aria-label="Nghe full"
            title="Nghe full"
          >
            Full
          </button>
        ) : null}
        {track.preview_url ? (
          <button
            type="button"
            onClick={() => onPlayTrack(track)}
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
          className="min-h-9 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted hover:border-rose-400 hover:text-rose-500 disabled:opacity-50"
        >
          Bỏ
        </button>
      </div>
    </div>
  );
}
