import type { MediaRecord } from "@/lib/types";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const getMediaPublicUrl = (storagePath: string) => {
  const { url: baseUrl } = getSupabaseConfig();

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
