import type { RoomRecord } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

export async function getUserRooms(): Promise<
  (RoomRecord & { member_count: number; other_members: string[] })[]
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships, error: memberError } = await supabase
    .from("room_members")
    .select("room_id");

  if (memberError || !memberships?.length || !user) {
    return [];
  }

  const roomIds = memberships.map((m) => m.room_id);

  const { data: rooms, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .in("id", roomIds)
    .order("created_at", { ascending: false });

  if (roomError) {
    console.error("Failed to load rooms", roomError.message);
    return [];
  }

  const results = await Promise.all(
    (rooms ?? []).map(async (room) => {
      const { data: membersInfo } = await supabase
        .from("room_members")
        .select(`
          user_id,
          profiles:user_id(display_name)
        `)
        .eq("room_id", room.id);

      const count = membersInfo?.length ?? 0;
      
      const otherMembers = (membersInfo ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => {
          // Type casting necessary since PostgREST can return an object or array of objects
          const prof = m.profiles as any;
          return prof?.display_name || "Khách ẩn danh";
        });

      return { ...room, member_count: count, other_members: otherMembers };
    })
  );

  return results;
}

export async function getRoomByInviteCode(
  code: string
): Promise<RoomRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("invite_code", code)
    .single();

  if (error) {
    return null;
  }

  return data ?? null;
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.user_metadata?.full_name ?? "Memory Keeper",
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  };
}
