import { NextResponse } from "next/server";
import play from "play-dl";
import ytSearch from "yt-search";
import type { MusicSearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const SUPPORTED_COUNTRIES = ["vn", "us", "kr", "jp", "gb"] as const;

// Cache trending results longer since they don't change often
const trendingCache = new Map<
  string,
  { data: MusicSearchResult[]; ts: number }
>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for trending

function normalizeJamendoTrack(
  track: any,
): MusicSearchResult {
  return {
    source: "jamendo",
    source_track_id: String(track.id ?? ""),
    title: track.name ?? "Unknown track",
    artist: track.artist_name ?? null,
    album: track.album_name ?? null,
    artwork_url: track.album_image ?? null,
    preview_url: track.audio ?? null,
    external_url: track.shareurl ?? null,
    duration_ms: (track.duration ?? 0) * 1000,
  };
}

function resolveCountry(country: string | null) {
  const normalized = (country ?? "vn").toLowerCase();
  return SUPPORTED_COUNTRIES.includes(
    normalized as (typeof SUPPORTED_COUNTRIES)[number],
  )
    ? normalized
    : "vn";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = resolveCountry(searchParams.get("country"));

  // Check cache
  const cacheKey = `trending:v3:${country}`;
  const cached = trendingCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      data: cached.data,
      meta: { country, cached: true },
    });
  }

  const queryMap: Record<string, string[]> = {
    vn: ["trending music việt nam mới nhất official audio 2025"],
    us: ["Billboard Hot 100 This Week official audio"],
    kr: ["Top Kpop Songs 2025 official audio"],
    jp: ["Top J-Pop hits 2025 new official"],
    gb: ["UK Top 40 Singles Chart new official MV"],
  };

  try {
    // 1. Load Jamendo (Always free & high quality)
    let jamendoTracks: MusicSearchResult[] = [];
    try {
      const jamendoResult = await fetch(
        "https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=20&order=popularity_total_desc&audioformat=mp32",
        { next: { revalidate: 3600 } }
      );
      if (jamendoResult.ok) {
        const payload = await jamendoResult.json();
        jamendoTracks = (payload.results ?? []).map(normalizeJamendoTrack);
      }
    } catch (e) { console.warn("Jamendo fetch failed"); }

    // 2. Load YouTube Trends via yt-search (more stable than play-dl search)
    const queries = queryMap[country] || ["trending music official 2025"];
    
    // Using simple loop for stability
    let ytData: MusicSearchResult[] = [];
    for (const q of queries) {
      try {
        const r = await ytSearch(q);
        const videos = r.videos.slice(0, 25).map((v) => ({
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
        ytData = [...ytData, ...videos];
      } catch (err) {
        console.error(`yt-search failed for ${q}`, err);
      }
    }

    // Deduplicate and combine
    const combined = [...ytData, ...jamendoTracks];
    const deduped = Array.from(
      new Map(
        combined.map((item) => [`${item.source}:${item.source_track_id}`, item]),
      ).values(),
    ).slice(0, 50);

    trendingCache.set(cacheKey, { data: deduped, ts: Date.now() });

    return NextResponse.json({ data: deduped, meta: { country } });
  } catch (error) {
    console.error("Trending API Error:", error);
    return NextResponse.json({ data: [], error: String(error) }, { status: 500 });
  }
}
