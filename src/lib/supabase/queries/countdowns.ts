import type { RoomCountdownRecord } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

export async function getRoomCountdowns(
  roomId: string,
): Promise<RoomCountdownRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_countdowns")
    .select(
      "id, room_id, added_by, title, description, target_date, emoji, is_passed, created_at, updated_at",
    )
    .eq("room_id", roomId)
    .order("target_date", { ascending: true });

  if (error) {
    console.error("[Countdowns] Failed to load countdowns:", error.message);
    return [];
  }

  return (data ?? []) as RoomCountdownRecord[];
}
