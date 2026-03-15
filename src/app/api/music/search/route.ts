import { NextResponse } from "next/server";
import ytSearch from "yt-search";
import type { MusicSearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory cache for search results (LRU-style with TTL)
const searchCache = new Map<
  string,
  { data: MusicSearchResult[]; ts: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

function getCached(key: string): MusicSearchResult[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: MusicSearchResult[]) {
  // Simple LRU eviction
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, ts: Date.now() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  // Check cache first
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached, meta: { cached: true } });
  }

  try {
    // Search with music-specific keywords for better results
    const musicQuery =
      query.includes("official") ||
      query.includes("MV") ||
      query.includes("audio")
        ? query
        : `${query} official audio`;

    const r = await ytSearch(musicQuery);
    const videos = r.videos.slice(0, 30);

    const data: MusicSearchResult[] = videos.map((v) => ({
      source: "youtube",
      source_track_id: v.videoId,
      title: v.title,
      artist: v.author.name,
      album: null,
      artwork_url: v.thumbnail ?? null,
      preview_url: `/api/music/play?id=${v.videoId}`,
      external_url: v.url,
      duration_ms: v.seconds * 1000,
    }));

    // Deduplicate by videoId
    const deduped = Array.from(
      new Map(
        data.map((item) => [`${item.source}:${item.source_track_id}`, item]),
      ).values(),
    );

    setCache(cacheKey, deduped);

    return NextResponse.json({ data: deduped });
  } catch (error) {
    console.error("YTSearch Error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
