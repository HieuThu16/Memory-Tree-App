import { NextResponse } from "next/server";
import ytSearch from "yt-search";
import type { MusicSearchResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const SUPPORTED_COUNTRIES = ["vn", "us", "kr", "jp", "gb"] as const;

// Cache trending results longer since they don't change often
const trendingCache = new Map<
  string,
  { data: MusicSearchResult[]; ts: number }
>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for trending

function normalizeJamendoTrack(
  track: Record<string, unknown>,
): MusicSearchResult {
  const title = String(track.name ?? "Unknown track");
  const artist =
    typeof track.artist_name === "string" ? track.artist_name : null;
  return {
    source: "jamendo",
    source_track_id: String(track.id ?? ""),
    title,
    artist,
    album: typeof track.album_name === "string" ? track.album_name : null,
    artwork_url:
      typeof track.album_image === "string" ? track.album_image : null,
    preview_url: typeof track.audio === "string" ? track.audio : null,
    external_url: typeof track.shareurl === "string" ? track.shareurl : null,
    duration_ms:
      typeof track.duration === "number" ? track.duration * 1000 : null,
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
  const cacheKey = `trending:${country}`;
  const cached = trendingCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      data: cached.data,
      meta: { country, cached: true },
    });
  }

  const queryMap: Record<string, string[]> = {
    vn: [
      "nhạc hot việt nam mới nhất official MV",
      "top bài hát hay nhất 2025 việt nam",
    ],
    us: [
      "top billboard hot 100 official music video",
      "trending music usa 2025",
    ],
    kr: ["top kpop songs 2025 official MV", "trending kpop music video new"],
    jp: ["top jpop songs 2025 official", "trending japanese music 2025 MV"],
    gb: ["UK top charts 2025 official music video", "trending UK music 2025"],
  };

  try {
    const jamendoResult = await fetch(
      "https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=24&order=popularity_total_desc&audioformat=mp32",
      { next: { revalidate: 900 } },
    );

    let jamendoTracks: MusicSearchResult[] = [];
    if (jamendoResult.ok) {
      const jamendoPayload = (await jamendoResult.json()) as {
        results?: Record<string, unknown>[];
      };
      jamendoTracks = (jamendoPayload.results ?? []).map(normalizeJamendoTrack);
    }

    const queries = queryMap[country] || ["trending music official 2025"];

    // Parallel search for multiple queries for richer results
    const results = await Promise.allSettled(queries.map((q) => ytSearch(q)));

    const allVideos = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value.videos : [],
    );

    const data: MusicSearchResult[] = allVideos.map((v) => ({
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
        [...jamendoTracks, ...data].map((item) => [
          `${item.source}:${item.source_track_id}`,
          item,
        ]),
      ).values(),
    ).slice(0, 40); // Return up to 40 results

    // Cache the results
    trendingCache.set(cacheKey, { data: deduped, ts: Date.now() });

    return NextResponse.json({ data: deduped, meta: { country } });
  } catch (error) {
    console.error("YTSearch Trending Error:", error);
    return NextResponse.json({ data: [], meta: { country } }, { status: 500 });
  }
}
