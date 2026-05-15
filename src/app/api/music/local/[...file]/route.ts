import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
};

const MUSIC_ROOT = path.resolve(process.cwd(), "music");

function safeResolveMusicPath(fileSegments: string[]): string | null {
  const decodedSegments = fileSegments.map((segment) => decodeURIComponent(segment));
  const resolved = path.resolve(MUSIC_ROOT, ...decodedSegments);

  if (!(resolved === MUSIC_ROOT || resolved.startsWith(MUSIC_ROOT + path.sep))) {
    return null;
  }

  return resolved;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ file: string[] }> },
) {
  const { file } = await context.params;
  if (!file?.length) {
    return new Response("Missing file path", { status: 400 });
  }

  const filePath = safeResolveMusicPath(file);
  if (!filePath) {
    return new Response("Invalid file path", { status: 400 });
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = AUDIO_CONTENT_TYPES[extension];
  if (!contentType) {
    return new Response("Unsupported file type", { status: 415 });
  }

  try {
    const fileStat = await stat(filePath);
    const totalSize = fileStat.size;
    const rangeHeader = request.headers.get("range");

    if (!rangeHeader) {
      const stream = createReadStream(filePath);
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": totalSize.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
    if (!match) {
      return new Response("Invalid range", { status: 416 });
    }

    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Number(match[2]) : totalSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= totalSize) {
      return new Response("Invalid range", { status: 416 });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": chunkSize.toString(),
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
