import type { RoomPlanRecord } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

export async function getRoomPlans(roomId: string): Promise<RoomPlanRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_plans")
    .select(
      "id, room_id, added_by, title, description, is_completed, completed_by, completed_at, created_at, updated_at",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load room plans", error.message);
    return [];
  }

  return (data ?? []) as RoomPlanRecord[];
}
