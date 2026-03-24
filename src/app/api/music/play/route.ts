import play from "play-dl";

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
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://piped-api.garudalinux.org",
];

const COBALT_API_BASE =
  process.env.MUSIC_COBALT_API_BASE ?? "https://api.cobalt.tools/";

const STREAM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function extractYouTubeId(input: string) {
  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (hostname.endsWith("youtube.com") || hostname.endsWith("youtube-nocookie.com")) {
      const vParam = parsed.searchParams.get("v");
      if (vParam) return vParam;
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "v") {
        return segments[1] || null;
      }
    }
  } catch { /**/ }
  return null;
}

function normalizeBaseUrl(base: string) {
  return base.endsWith("/") ? base : `${base}/`;
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, cache: "no-store" });
      if (res.ok) return res;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
  return null;
}

async function resolveCobaltAudio(url: string) {
  try {
    const response = await fetch(normalizeBaseUrl(COBALT_API_BASE), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ url, downloadMode: "audio", audioFormat: "best" }),
    });
    const payload = await response.json();
    return payload.url ? { streamUrl: payload.url, contentType: payload.mime || "audio/mpeg" } : null;
  } catch { return null; }
}

async function resolvePipedAudio(id: string) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${id}`);
      if (!res.ok) continue;
      const data = await res.json();
      const stream = data.audioStreams?.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (stream?.url) return { streamUrl: stream.url, contentType: stream.mimeType };
    } catch { /**/ }
  }
  return null;
}

async function resolveInvidiousAudio(id: string) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${id}`);
      if (!res.ok) continue;
      const data = await res.json();
      const format = data.adaptiveFormats?.filter((f: any) => f.type?.includes("audio/"))
        .sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0))[0];
      if (format?.url) return { streamUrl: format.url, contentType: format.type.split(";")[0] };
    } catch { /**/ }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const url = searchParams.get("url");

  let targetUrl = url;
  let videoId = id;

  if (id && !url) {
    targetUrl = `https://www.youtube.com/watch?v=${id}`;
  } else if (url) {
    videoId = extractYouTubeId(url);
  }

  if (!targetUrl) {
    return Response.json({ error: "Missing id or url" }, { status: 400 });
  }

  console.log(`[Music Play] Resolving: ${targetUrl}`);

  try {
    // 1. Try Cobalt first (often most reliable across different environments)
    const cobalt = await resolveCobaltAudio(targetUrl);
    if (cobalt) {
      try {
        const res = await fetch(cobalt.streamUrl, { headers: { "User-Agent": STREAM_USER_AGENT } });
        if (res.ok && res.body) {
           console.log(`[Music Play] Playing via Cobalt: ${targetUrl}`);
           return new Response(res.body, {
             headers: { "Content-Type": cobalt.contentType || "audio/mpeg", "Accept-Ranges": "bytes", "X-Music-Source": "cobalt-proxy" }
           });
        }
      } catch (e) { console.warn("Cobalt stream fetch failed"); }
    }

    // 2. Try Piped (Excellent for YouTube IDs)
    if (videoId) {
      const piped = await resolvePipedAudio(videoId);
      if (piped) {
        try {
          const res = await fetch(piped.streamUrl, { headers: { "User-Agent": STREAM_USER_AGENT } });
          if (res.ok && res.body) {
            console.log(`[Music Play] Playing via Piped: ${videoId}`);
            return new Response(res.body, {
              headers: { "Content-Type": piped.contentType || "audio/mpeg", "Accept-Ranges": "bytes", "X-Music-Source": "piped-api" }
            });
          }
        } catch (e) { console.warn("Piped stream fetch failed"); }
      }
    }

    // 3. Fallback: play-dl direct
    try {
      const streamInfo = (await play.stream(targetUrl, { quality: 2 })) as any;
      if (streamInfo?.url) {
        const streamResponse = await fetch(streamInfo.url, {
          headers: { "User-Agent": STREAM_USER_AGENT, "Range": request.headers.get("Range") || "bytes=0-" }
        });
        
        if (streamResponse.ok && streamResponse.body) {
          console.log(`[Music Play] Playing via play-dl direct: ${targetUrl}`);
          return new Response(streamResponse.body, {
            status: streamResponse.status,
            headers: {
              "Content-Type": streamInfo.type || "audio/mpeg",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600",
              "Accept-Ranges": "bytes",
              "X-Music-Source": "play-dl-direct"
            }
          });
        }
      }
    } catch (e) {
      console.warn("[Music Play] play-dl direct failed.");
    }

    // 4. Final Fallback: Invidious
    if (videoId) {
      const invidious = await resolveInvidiousAudio(videoId);
      if (invidious) {
        try {
          const res = await fetch(invidious.streamUrl, { headers: { "User-Agent": STREAM_USER_AGENT } });
          if (res.ok && res.body) {
            console.log(`[Music Play] Playing via Invidious: ${videoId}`);
            return new Response(res.body, {
              headers: { "Content-Type": invidious.contentType || "audio/mpeg", "Accept-Ranges": "bytes", "X-Music-Source": "invidious-fallback" }
            });
          }
        } catch (e) { console.warn("Invidious stream fetch failed"); }
      }
    }

    return Response.json({ error: "Failed to resolve playable stream" }, { status: 500 });

  } catch (error) {
    console.error("[Music Play] Fatal Error:", error);
    return Response.json({ error: "Fatal error streaming music", details: String(error) }, { status: 500 });
  }
}
