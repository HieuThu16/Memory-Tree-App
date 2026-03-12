import type { CreateMemoryInput, MemoryRecord } from "@/lib/types";
import { MEMORY_SELECT } from "@/lib/supabase/selects";
import { createSupabaseServerClient } from "../server";

export async function getPersonalMemories(): Promise<MemoryRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(MEMORY_SELECT)
    .is("room_id", null)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to load memories", error.message);
    return [];
  }

  return data ?? [];
}

export async function getMemoryById(id: string): Promise<MemoryRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(MEMORY_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to load memory", error.message);
    return null;
  }

  return data ?? null;
}

export async function getRoomMemories(roomId: string): Promise<MemoryRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memories")
    .select(MEMORY_SELECT)
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
