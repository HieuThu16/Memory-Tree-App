import type { MediaRecord } from "@/lib/types";

export const getMediaPublicUrl = (storagePath: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) {
    return storagePath;
  }

  return `${baseUrl}/storage/v1/object/public/media/${storagePath}`;
};

export const getPrimaryMedia = (media: MediaRecord[] | undefined) => {
  if (!media?.length) {
    return null;
  }

  return media[0];
};
