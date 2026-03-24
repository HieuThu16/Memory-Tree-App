import { NextResponse } from "next/server";
import play from "play-dl";
import ytSearch from "yt-search";
import type { MusicSearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory cache for search results (LRU-style with TTL)
const searchCache = new Map<
  string,
  { data: MusicSearchResult[]; ts: number }
>();
const CACHE_TTL = 10 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

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

  const cacheKey = `search:v3:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached, meta: { cached: true } });
  }

  try {
    // 1. YouTube Search (using yt-search for guaranteed stability)
    const ytQuery = query.includes("official") ? query : `${query} official audio`;
    const r = await ytSearch(ytQuery);
    const videos = r.videos.slice(0, 25);

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

    // SoundCloud search is currently unstable, skipping for now
    const combined = [...data];
    
    // Deduplicate
    const deduped = Array.from(
      new Map(
        combined.map((item) => [`${item.source}:${item.source_track_id}`, item]),
      ).values(),
    );

    setCache(cacheKey, deduped);

    return NextResponse.json({ data: deduped });
  } catch (error) {
    console.error("Music Search Error:", error);
    return NextResponse.json({ data: [], error: String(error) }, { status: 500 });
  }
}
