export function formatDuration(durationMs: number | null) {
  if (!durationMs) return "--:--";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function isRecentlyAdded(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000;
}
