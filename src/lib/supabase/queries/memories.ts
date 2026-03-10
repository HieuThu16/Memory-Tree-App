import type { CreateMemoryInput, MemoryRecord } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

const memorySelect =
  "id, user_id, room_id, parent_id, title, content, date, type, position_x, position_y, created_at";

export async function getPersonalMemories(): Promise<MemoryRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(memorySelect)
    .is("room_id", null)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to load memories", error.message);
    return [];
  }

  return data ?? [];
}

export async function getMemoryById(
  id: string
): Promise<MemoryRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(`${memorySelect}, media(id, memory_id, storage_path, media_type, thumbnail, duration, created_at)`)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to load memory", error.message);
    return null;
  }

  return data ?? null;
}

export async function getRoomMemories(
  roomId: string
): Promise<MemoryRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(memorySelect)
    .eq("room_id", roomId)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to load room memories", error.message);
    return [];
  }

  return data ?? [];
}

export async function getMemoryStats() {
  const supabase = await createSupabaseServerClient();
  const { count: total } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null);

  const { count: diaryCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "diary");

  const { count: photoCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "photo");

  const { count: videoCount } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .is("room_id", null)
    .eq("type", "video");

  return {
    total: total ?? 0,
    diary: diaryCount ?? 0,
    photo: photoCount ?? 0,
    video: videoCount ?? 0,
  };
}
