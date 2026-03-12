import type { PlaylistRecord, PlaylistTrackRecord } from "@/lib/types";
import { PLAYLIST_SELECT } from "@/lib/supabase/selects";
import { createSupabaseServerClient } from "../server";

function sortPlaylistTracks(playlist: PlaylistRecord): PlaylistRecord {
  return {
    ...playlist,
    tracks: [...(playlist.tracks ?? [])].sort((left, right) => {
      if (left.position !== right.position) {
        return left.position - right.position;
      }

      return left.created_at.localeCompare(right.created_at);
    }),
  };
}

export async function getRoomPlaylists(
  roomId: string,
): Promise<PlaylistRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load room playlists", error.message);
    return [];
  }

  return ((data ?? []) as PlaylistRecord[]).map(sortPlaylistTracks);
}

export async function getPlaylistById(
  playlistId: string,
): Promise<PlaylistRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("playlists")
    .select(PLAYLIST_SELECT)
    .eq("id", playlistId)
    .single();

  if (error || !data) {
    return null;
  }

  return sortPlaylistTracks(data as PlaylistRecord);
}

export function sortTracksByPosition(tracks: PlaylistTrackRecord[]) {
  return [...tracks].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.created_at.localeCompare(right.created_at);
  });
}
