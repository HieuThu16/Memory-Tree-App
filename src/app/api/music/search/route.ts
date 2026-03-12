import { NextResponse } from "next/server";
import type { MusicSearchResult } from "@/lib/types";

function normalizeItunesTrack(
  track: Record<string, unknown>,
): MusicSearchResult {
  return {
    source: "itunes",
    source_track_id: String(
      track.trackId ?? track.collectionId ?? track.artistId,
    ),
    title: String(track.trackName ?? "Unknown track"),
    artist: typeof track.artistName === "string" ? track.artistName : null,
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

  return {
    source: "deezer",
    source_track_id: String(track.id ?? track.md5_image ?? track.link),
    title: String(track.title ?? "Unknown track"),
    artist: typeof artist?.name === "string" ? artist.name : null,
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
  return {
    source: "jamendo",
    source_track_id: String(track.id ?? ""),
    title: String(track.name ?? "Unknown track"),
    artist: typeof track.artist_name === "string" ? track.artist_name : null,
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
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const encodedQuery = encodeURIComponent(query);
  const [itunesResult, deezerResult, jamendoResult] = await Promise.allSettled([
    fetch(
      `https://itunes.apple.com/search?term=${encodedQuery}&entity=song&limit=8`,
      { next: { revalidate: 300 } },
    ),
    fetch(`https://api.deezer.com/search?q=${encodedQuery}&limit=8`, {
      next: { revalidate: 300 },
    }),
    fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=8&namesearch=${encodedQuery}&include=musicinfo&audioformat=mp32`,
      { next: { revalidate: 300 } },
    ),
  ]);

  const items: MusicSearchResult[] = [];

  if (itunesResult.status === "fulfilled" && itunesResult.value.ok) {
    const payload = (await itunesResult.value.json()) as {
      results?: Record<string, unknown>[];
    };
    items.push(...(payload.results ?? []).map(normalizeItunesTrack));
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

  const deduped = Array.from(
    new Map(
      items
        .filter((item) => item.title && item.source_track_id)
        .map((item) => [`${item.source}:${item.source_track_id}`, item]),
    ).values(),
  );

  return NextResponse.json({ data: deduped.slice(0, 24) });
}
