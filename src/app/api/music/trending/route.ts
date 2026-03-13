import { NextResponse } from "next/server";
import type { MusicSearchResult } from "@/lib/types";

const SUPPORTED_COUNTRIES = ["vn", "us", "kr", "jp", "gb"] as const;

function resolveCountry(country: string | null) {
  const normalized = (country ?? "vn").toLowerCase();
  return SUPPORTED_COUNTRIES.includes(
    normalized as (typeof SUPPORTED_COUNTRIES)[number],
  )
    ? normalized
    : "vn";
}

function normalizeItunesTrack(
  track: Record<string, unknown>,
): MusicSearchResult {
  const title = String(track.trackName ?? "Unknown track");
  const artist = typeof track.artistName === "string" ? track.artistName : null;
  return {
    source: "itunes",
    source_track_id: String(
      track.trackId ?? track.collectionId ?? track.artistId,
    ),
    title,
    artist,
    album:
      typeof track.collectionName === "string" ? track.collectionName : null,
    artwork_url:
      typeof track.artworkUrl100 === "string"
        ? track.artworkUrl100.replace("100x100", "300x300")
        : null,
    preview_url: typeof track.previewUrl === "string" ? track.previewUrl : null,
    external_url:
      typeof track.trackViewUrl === "string" ? track.trackViewUrl : null,
    duration_ms:
      typeof track.trackTimeMillis === "number" ? track.trackTimeMillis : null,
  };
}

function normalizeDeezerTrack(
  track: Record<string, unknown>,
): MusicSearchResult {
  const album =
    track.album && typeof track.album === "object"
      ? (track.album as Record<string, unknown>)
      : null;
  const artist =
    track.artist && typeof track.artist === "object"
      ? (track.artist as Record<string, unknown>)
      : null;

  const title = String(track.title ?? "Unknown track");
  const artistName = typeof artist?.name === "string" ? artist.name : null;

  return {
    source: "deezer",
    source_track_id: String(track.id ?? track.md5_image ?? track.link),
    title,
    artist: artistName,
    album: typeof album?.title === "string" ? album.title : null,
    artwork_url:
      typeof album?.cover_medium === "string"
        ? album.cover_medium
        : typeof album?.cover === "string"
          ? album.cover
          : null,
    preview_url: typeof track.preview === "string" ? track.preview : null,
    external_url: typeof track.link === "string" ? track.link : null,
    duration_ms:
      typeof track.duration === "number" ? track.duration * 1000 : null,
  };
}

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = resolveCountry(searchParams.get("country"));

  const [itunesResult, deezerResult, jamendoResult] = await Promise.allSettled([
    fetch(
      `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/30/songs.json`,
      {
        next: { revalidate: 300 },
      },
    ),
    fetch("https://api.deezer.com/chart/0/tracks?limit=30", {
      next: { revalidate: 300 },
    }),
    fetch(
      "https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=30&order=popularity_total&include=musicinfo&audioformat=mp32",
      { next: { revalidate: 300 } },
    ),
  ]);

  const items: MusicSearchResult[] = [];

  if (itunesResult.status === "fulfilled" && itunesResult.value.ok) {
    const payload = (await itunesResult.value.json()) as {
      feed?: {
        results?: Array<{
          id?: string;
          name?: string;
          artistName?: string;
          artworkUrl100?: string;
          url?: string;
        }>;
      };
    };

    const normalized = (payload.feed?.results ?? []).map((track) =>
      normalizeItunesTrack({
        trackId: track.id,
        trackName: track.name,
        artistName: track.artistName,
        artworkUrl100: track.artworkUrl100,
        trackViewUrl: track.url,
      }),
    );

    items.push(...normalized);
  }

  if (deezerResult.status === "fulfilled" && deezerResult.value.ok) {
    const payload = (await deezerResult.value.json()) as {
      data?: Record<string, unknown>[];
    };
    items.push(...(payload.data ?? []).map(normalizeDeezerTrack));
  }

  if (jamendoResult.status === "fulfilled" && jamendoResult.value.ok) {
    const payload = (await jamendoResult.value.json()) as {
      results?: Record<string, unknown>[];
    };
    items.push(...(payload.results ?? []).map(normalizeJamendoTrack));
  }

  const grouped = {
    itunes: [] as MusicSearchResult[],
    deezer: [] as MusicSearchResult[],
    jamendo: [] as MusicSearchResult[],
  };

  for (const item of items) {
    if (!item.title || !item.source_track_id || !item.preview_url) {
      continue;
    }

    if (item.source === "itunes") {
      grouped.itunes.push(item);
    } else if (item.source === "deezer") {
      grouped.deezer.push(item);
    } else if (item.source === "jamendo") {
      grouped.jamendo.push(item);
    }
  }

  const dedupeBySource = (tracks: MusicSearchResult[]) =>
    Array.from(
      new Map(tracks.map((item) => [item.source_track_id, item])).values(),
    ).slice(0, 30);

  const deduped = [
    ...dedupeBySource(grouped.itunes),
    ...dedupeBySource(grouped.deezer),
    ...dedupeBySource(grouped.jamendo),
  ];

  return NextResponse.json({ data: deduped, meta: { country } });
}
