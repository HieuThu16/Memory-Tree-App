import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://invidious.privacyredirect.com",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
];

type FallbackAudioFormat = {
  type?: string;
  bitrate?: string | number;
  url?: string;
};

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

async function getInfoWithFallbackClients(videoUrl: string) {
  const clientOptions: Array<Record<string, unknown>> = [
    { playerClients: ["ANDROID", "WEB"] },
    { playerClients: ["IOS", "ANDROID", "WEB"] },
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

      return {
        streamUrl: selected.url,
        contentType: selected.type?.split(";")[0] ?? null,
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

      const fallbackResponse = await fetch(fallback.streamUrl, {
        cache: "no-store",
      });
      if (!fallbackResponse.ok || !fallbackResponse.body) {
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

    let bestFormat: ytdl.videoFormat;
    try {
      bestFormat = pickYtdlFormat(info.formats, preferMp4);
    } catch (formatError) {
      console.error(
        `[Music Play] Failed selecting ytdl format for ${id}:`,
        formatError,
      );
      const fallback = await resolveInvidiousAudio(id, preferMp4);
      if (!fallback) {
        return Response.json(
          {
            error: "No playable formats found",
            details: String(formatError),
          },
          { status: 422 },
        );
      }

      const fallbackResponse = await fetch(fallback.streamUrl, {
        cache: "no-store",
      });
      if (!fallbackResponse.ok || !fallbackResponse.body) {
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
    const contentType = bestFormat.mimeType?.split(";")[0] || "audio/webm";
    console.log(
      `[Music Play] Using format: ${contentType}, bitrate: ${bestFormat.audioBitrate}kbps`,
    );

    const stream = ytdl.downloadFromInfo(info, {
      format: bestFormat,
    });

    const headers = new Headers({
      "Content-Type": contentType,
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=600",
      "X-Content-Type-Options": "nosniff",
    });

    if (bestFormat.contentLength) {
      headers.set("Content-Length", bestFormat.contentLength);
    }

    let bytesStreamed = 0;
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Uint8Array) => {
          try {
            controller.enqueue(chunk);
            bytesStreamed += chunk.length;
          } catch {
            // Controller already closed, ignore
          }
        });
        stream.on("end", () => {
          console.log(
            `[Music Play] Stream ended for ${id}. Total bytes: ${bytesStreamed}`,
          );
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
        stream.on("error", (error: Error) => {
          console.error(`[Music Play] Stream error for ${id}:`, error.message);
          try {
            controller.error(error);
          } catch {
            // Already closed
          }
        });
      },
      cancel() {
        console.log(`[Music Play] Client cancelled stream for ${id}`);
        stream.destroy();
      },
    });

    return new Response(readableStream, { headers });
  } catch (error) {
    console.error(`[Music Play] YTDL Error for ${id}:`, error);
    return Response.json(
      { error: "Error streaming audio", details: String(error) },
      { status: 500 },
    );
  }
}
