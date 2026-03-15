import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.privacyredirect.com",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://invidious.projectsegfau.lt",
  "https://invidious.slipfox.xyz",
];

const PIPED_INSTANCES = [
  "https://piped.video",
  "https://piped.adminforge.de",
  "https://piped.private.coffee",
  "https://piped.seitan-ayoub.lol",
  "https://piped.syncpundit.io",
];

type FallbackAudioFormat = {
  type?: string;
  bitrate?: string | number;
  url?: string;
};

type DirectStreamCandidate = {
  url: string;
  contentType: string;
  audioBitrate: number;
};

const STREAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function shouldPreferMp4(userAgent: string | null) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  const isSafari = /safari/.test(ua) && !/chrome|chromium|android/.test(ua);
  const isIos = /iphone|ipad|ipod/.test(ua);
  return isSafari || isIos;
}

function parseBitrate(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pickYtdlFormat(
  formats: ytdl.videoFormat[],
  preferMp4: boolean,
): ytdl.videoFormat {
  const audioFormats = ytdl.filterFormats(formats, "audioonly");
  const muxedFormats = formats.filter(
    (format) => Boolean(format.audioBitrate) && Boolean(format.url),
  );
  const mp4Formats = audioFormats.filter((format) =>
    format.mimeType?.includes("audio/mp4"),
  );

  if (preferMp4 && mp4Formats.length > 0) {
    return ytdl.chooseFormat(mp4Formats, { quality: "highestaudio" });
  }

  if (audioFormats.length === 0) {
    if (muxedFormats.length > 0) {
      return ytdl.chooseFormat(muxedFormats, { quality: "highestaudio" });
    }
    throw new Error("No audio format available for this video");
  }

  return ytdl.chooseFormat(audioFormats, { quality: "highestaudio" });
}

function scoreFormat(format: ytdl.videoFormat) {
  if (typeof format.audioBitrate === "number") return format.audioBitrate;
  if (typeof format.bitrate === "number")
    return Math.round(format.bitrate / 1000);
  return 0;
}

function collectDirectStreamCandidates(
  formats: ytdl.videoFormat[],
  preferMp4: boolean,
): DirectStreamCandidate[] {
  const audioOnly = ytdl
    .filterFormats(formats, "audioonly")
    .filter((format) => Boolean(format.url));

  const muxed = formats.filter(
    (format) => Boolean(format.audioBitrate) && Boolean(format.url),
  );

  const ordered = [...audioOnly, ...muxed].sort((a, b) => {
    const mimeA = a.mimeType?.includes("audio/mp4") ? 1 : 0;
    const mimeB = b.mimeType?.includes("audio/mp4") ? 1 : 0;
    const mp4Priority = preferMp4 ? mimeB - mimeA : mimeA - mimeB;
    if (mp4Priority !== 0) return mp4Priority;
    return scoreFormat(b) - scoreFormat(a);
  });

  const usedUrls = new Set<string>();
  const candidates: DirectStreamCandidate[] = [];

  for (const format of ordered) {
    if (!format.url || usedUrls.has(format.url)) continue;
    usedUrls.add(format.url);
    candidates.push({
      url: format.url,
      contentType: format.mimeType?.split(";")[0] || "audio/webm",
      audioBitrate: scoreFormat(format),
    });
    if (candidates.length >= 6) break;
  }

  return candidates;
}

async function openDirectAudioStream(url: string) {
  return fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "user-agent": STREAM_USER_AGENT,
      accept: "*/*",
      range: "bytes=0-",
      referer: "https://www.youtube.com/",
      origin: "https://www.youtube.com",
    },
  });
}

function resolveAbsoluteUrl(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

async function openExternalFallbackStream(url: string) {
  return fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "user-agent": STREAM_USER_AGENT,
      accept: "*/*",
      referer: "https://www.youtube.com/",
      origin: "https://www.youtube.com",
    },
  });
}

async function openExternalFallbackStreamWithoutOrigin(url: string) {
  return fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "user-agent": STREAM_USER_AGENT,
      accept: "*/*",
    },
  });
}

async function getInfoWithFallbackClients(videoUrl: string) {
  const clientOptions: Array<Record<string, unknown>> = [
    { playerClients: ["TVHTML5", "ANDROID", "WEB"] },
    { playerClients: ["ANDROID", "WEB"] },
    { playerClients: ["IOS", "ANDROID", "WEB"] },
    { playerClients: ["WEB_EMBEDDED", "ANDROID"] },
    { playerClients: ["WEB", "MWEB"] },
    {},
  ];

  let lastError: unknown = null;

  for (const option of clientOptions) {
    try {
      const info = await ytdl.getInfo(videoUrl, option);
      return info;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Could not fetch video info");
}

function pickFallbackFormat(
  formats: FallbackAudioFormat[],
  preferMp4: boolean,
) {
  const playable = formats.filter(
    (format) => typeof format.url === "string" && format.url.length > 0,
  );

  if (playable.length === 0) {
    return null;
  }

  const mp4 = playable.filter((format) => format.type?.includes("audio/mp4"));

  const pool = preferMp4 && mp4.length > 0 ? mp4 : playable;

  return pool
    .slice()
    .sort((a, b) => parseBitrate(b.bitrate) - parseBitrate(a.bitrate))[0];
}

async function resolveInvidiousAudio(
  id: string,
  preferMp4: boolean,
): Promise<{ streamUrl: string; contentType: string | null } | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${id}`, {
        cache: "no-store",
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        adaptiveFormats?: FallbackAudioFormat[];
      };

      const selected = pickFallbackFormat(
        payload.adaptiveFormats ?? [],
        preferMp4,
      );
      if (!selected?.url) continue;

      const streamUrl = resolveAbsoluteUrl(selected.url, instance);

      return {
        streamUrl,
        contentType: selected.type?.split(";")[0] ?? null,
      };
    } catch {
      // Try the next instance
    }
  }

  return null;
}

async function resolvePipedAudio(
  id: string,
  preferMp4: boolean,
): Promise<{ streamUrl: string; contentType: string | null } | null> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const response = await fetch(`${instance}/streams/${id}`, {
        cache: "no-store",
        headers: {
          accept: "application/json",
        },
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        audioStreams?: Array<{
          url?: string;
          mimeType?: string;
          bitrate?: number;
        }>;
      };

      const streams = (payload.audioStreams ?? []).filter(
        (stream) => typeof stream.url === "string" && stream.url.length > 0,
      );

      if (streams.length === 0) continue;

      const sorted = streams.sort((a, b) => {
        const aMp4 = a.mimeType?.includes("audio/mp4") ? 1 : 0;
        const bMp4 = b.mimeType?.includes("audio/mp4") ? 1 : 0;
        const mimePriority = preferMp4 ? bMp4 - aMp4 : aMp4 - bMp4;
        if (mimePriority !== 0) return mimePriority;

        const aBitrate = typeof a.bitrate === "number" ? a.bitrate : 0;
        const bBitrate = typeof b.bitrate === "number" ? b.bitrate : 0;
        return bBitrate - aBitrate;
      });

      const selected = sorted[0];
      if (!selected?.url) continue;

      const streamUrl = resolveAbsoluteUrl(selected.url, instance);

      return {
        streamUrl,
        contentType: selected.mimeType ?? null,
      };
    } catch {
      // Try the next instance
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const userAgent = request.headers.get("user-agent");
  const preferMp4 = shouldPreferMp4(userAgent);

  if (!id) {
    return Response.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  console.log(`[Music Play] Starting stream for video: ${id}`);

  try {
    // Validate that the video is available first
    let info;
    try {
      info = await getInfoWithFallbackClients(videoUrl);
      console.log(`[Music Play] Got info for: ${info.videoDetails.title}`);
    } catch (infoError) {
      console.error(
        `[Music Play] Failed to get video info for ${id}:`,
        infoError,
      );
      const fallback = await resolveInvidiousAudio(id, preferMp4);
      if (!fallback) {
        return Response.json(
          {
            error: "Video unavailable or restricted",
            details: String(infoError),
          },
          { status: 422 },
        );
      }

      const fallbackResponse = await openExternalFallbackStream(
        fallback.streamUrl,
      );
      if (!fallbackResponse.ok || !fallbackResponse.body) {
        console.warn(
          `[Music Play] Initial Invidious fallback failed: ${fallbackResponse.status} for ${id}`,
        );
        return Response.json(
          { error: "Could not open fallback audio source" },
          { status: 422 },
        );
      }

      const headers = new Headers({
        "Content-Type":
          fallback.contentType ??
          fallbackResponse.headers.get("content-type") ??
          "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=600",
        "X-Content-Type-Options": "nosniff",
        "X-Music-Source": "invidious-fallback",
      });

      const contentLength = fallbackResponse.headers.get("content-length");
      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      return new Response(fallbackResponse.body, { headers });
    }

    let directCandidates: DirectStreamCandidate[] = [];
    try {
      const picked = pickYtdlFormat(info.formats, preferMp4);
      directCandidates = [
        {
          url: picked.url,
          contentType: picked.mimeType?.split(";")[0] || "audio/webm",
          audioBitrate: scoreFormat(picked),
        },
        ...collectDirectStreamCandidates(info.formats, preferMp4),
      ].filter((candidate) => Boolean(candidate.url));
    } catch (formatError) {
      console.error(
        `[Music Play] Failed selecting ytdl format for ${id}:`,
        formatError,
      );
      directCandidates = collectDirectStreamCandidates(info.formats, preferMp4);
    }

    const dedupedCandidates: DirectStreamCandidate[] = [];
    const seenUrls = new Set<string>();
    for (const candidate of directCandidates) {
      if (!candidate.url || seenUrls.has(candidate.url)) continue;
      seenUrls.add(candidate.url);
      dedupedCandidates.push(candidate);
    }

    for (const candidate of dedupedCandidates) {
      console.log(
        `[Music Play] Trying direct stream: ${candidate.contentType}, bitrate: ${candidate.audioBitrate}kbps`,
      );
      try {
        const upstream = await openDirectAudioStream(candidate.url);
        if (!upstream.ok || !upstream.body) {
          console.warn(
            `[Music Play] Direct stream failed with status ${upstream.status} for ${id}`,
          );
          continue;
        }

        const headers = new Headers({
          "Content-Type":
            upstream.headers.get("content-type") ?? candidate.contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=600",
          "X-Content-Type-Options": "nosniff",
          "X-Music-Source": "youtube-direct-url",
        });

        const contentLength = upstream.headers.get("content-length");
        if (contentLength) {
          headers.set("Content-Length", contentLength);
        }

        return new Response(upstream.body, {
          headers,
          status: upstream.status,
        });
      } catch (directStreamError) {
        console.warn(
          `[Music Play] Direct stream attempt crashed for ${id}:`,
          directStreamError,
        );
      }
    }

    console.warn(
      `[Music Play] All direct YouTube URLs failed for ${id}. Trying Piped/Invidious fallbacks...`,
    );

    const pipedFallback = await resolvePipedAudio(id, preferMp4);
    if (pipedFallback) {
      const pipedResponse = await openExternalFallbackStream(
        pipedFallback.streamUrl,
      );

      const pipedResponseNoOrigin =
        !pipedResponse.ok || !pipedResponse.body
          ? await openExternalFallbackStreamWithoutOrigin(
              pipedFallback.streamUrl,
            )
          : null;

      const finalPipedResponse =
        pipedResponse.ok && pipedResponse.body
          ? pipedResponse
          : pipedResponseNoOrigin;

      if (finalPipedResponse?.ok && finalPipedResponse.body) {
        const headers = new Headers({
          "Content-Type":
            pipedFallback.contentType ??
            finalPipedResponse.headers.get("content-type") ??
            "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=600",
          "X-Content-Type-Options": "nosniff",
          "X-Music-Source": "piped-fallback",
        });

        const contentLength = finalPipedResponse.headers.get("content-length");
        if (contentLength) {
          headers.set("Content-Length", contentLength);
        }

        return new Response(finalPipedResponse.body, { headers });
      }

      console.warn(
        `[Music Play] Piped fallback failed with status ${pipedResponse.status} for ${id}`,
      );
    } else {
      console.warn(`[Music Play] No Piped stream found for ${id}`);
    }

    const fallback = await resolveInvidiousAudio(id, preferMp4);
    if (!fallback) {
      console.warn(`[Music Play] No Invidious stream found for ${id}`);
      return Response.json(
        { error: "No playable stream source found" },
        { status: 422 },
      );
    }

    const fallbackResponse = await openExternalFallbackStream(
      fallback.streamUrl,
    );
    const fallbackResponseNoOrigin =
      !fallbackResponse.ok || !fallbackResponse.body
        ? await openExternalFallbackStreamWithoutOrigin(fallback.streamUrl)
        : null;
    const finalFallbackResponse =
      fallbackResponse.ok && fallbackResponse.body
        ? fallbackResponse
        : fallbackResponseNoOrigin;

    if (!finalFallbackResponse?.ok || !finalFallbackResponse.body) {
      console.warn(
        `[Music Play] Invidious fallback failed with status ${fallbackResponse.status} for ${id}`,
      );
      return Response.json(
        { error: "Could not open fallback audio source" },
        { status: 422 },
      );
    }

    const headers = new Headers({
      "Content-Type":
        fallback.contentType ??
        finalFallbackResponse.headers.get("content-type") ??
        "audio/mpeg",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=600",
      "X-Content-Type-Options": "nosniff",
      "X-Music-Source": "invidious-fallback",
    });

    const contentLength = finalFallbackResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(finalFallbackResponse.body, { headers });
  } catch (error) {
    console.error(`[Music Play] YTDL Error for ${id}:`, error);
    return Response.json(
      { error: "Error streaming audio", details: String(error) },
      { status: 500 },
    );
  }
}
