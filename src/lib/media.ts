import type { MediaRecord } from "@/lib/types";
import { getSupabaseConfig } from "@/lib/supabase/config";

const mediaUrlCache = new Map<string, string>();

export const getMediaPublicUrl = (storagePath: string) => {
  const normalizedPath = storagePath.replace(/^\/+/, "");
  const cachedUrl = mediaUrlCache.get(normalizedPath);

  if (cachedUrl) {
    return cachedUrl;
  }

  const { url: baseUrl } = getSupabaseConfig();

  if (!baseUrl) {
    return normalizedPath;
  }

  const publicUrl = `${baseUrl}/storage/v1/object/public/media/${normalizedPath}`;
  mediaUrlCache.set(normalizedPath, publicUrl);

  return publicUrl;
};

export const getPrimaryMedia = (media: MediaRecord[] | undefined) => {
  if (!media?.length) {
    return null;
  }

  return media[0];
};

export const isImageMedia = (media?: MediaRecord | null) => {
  if (!media) {
    return false;
  }

  const mediaType = media.media_type?.toLowerCase();

  if (!mediaType) {
    return true;
  }

  return mediaType === "image" || mediaType.startsWith("image/");
};

export const getPrimaryImageMedia = (media: MediaRecord[] | undefined) => {
  if (!media?.length) {
    return null;
  }

  return media.find(isImageMedia) ?? null;
};

export const getMediaDownloadName = (
  storagePath: string,
  mediaType?: string | null,
) => {
  const fileName = storagePath.split("/").pop()?.split("?")[0];

  if (fileName) {
    return fileName;
  }

  const extension =
    mediaType === "video" || mediaType?.startsWith("video") ? "mp4" : "jpg";

  return `memory-media.${extension}`;
};
