import type { MemoryParticipant, RoomRecord } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

type RoomMemberProfile = { display_name: string | null };
type RoomParticipantProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

export async function getUserRooms(): Promise<
  (RoomRecord & {
    member_count: number;
    other_members: string[];
    shared_member_count: number;
    is_shared: boolean;
    invite_only: boolean;
  })[]
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: memberships, error: memberError } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", user.id);

  if (memberError || !memberships?.length) {
    return [];
  }

  const roomIds = [...new Set(memberships.map((m) => m.room_id))];

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
        .select(
          `
          user_id,
          profiles(display_name)
        `,
        )
        .eq("room_id", room.id);

      const count = membersInfo?.length ?? 0;

      const otherMembers = (membersInfo ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => {
          const prof = m.profiles as
            | RoomMemberProfile
            | RoomMemberProfile[]
            | null;
          const resolvedProfile = Array.isArray(prof) ? prof[0] : prof;
          return resolvedProfile?.display_name || "Khách ẩn danh";
        });

      const sharedMemberCount = (membersInfo ?? []).filter(
        (member) => member.user_id !== room.created_by,
      ).length;

      return {
        ...room,
        member_count: count,
        other_members: otherMembers,
        shared_member_count: sharedMemberCount,
        is_shared: sharedMemberCount > 0,
        invite_only: sharedMemberCount === 0,
      };
    }),
  );

  return results;
}

export async function getRoomByInviteCode(
  code: string,
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
    displayName:
      profile?.display_name ?? user.user_metadata?.full_name ?? "Memory Keeper",
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
  };
}

export async function getRoomParticipants(
  roomId: string,
): Promise<MemoryParticipant[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_members")
    .select(
      `
        user_id,
        role,
        profiles(display_name, avatar_url)
      `,
    )
    .eq("room_id", roomId);

  if (error) {
    console.error("Failed to load room participants", error.message);
    return [];
  }

  return (data ?? []).map((member) => {
    const rawProfile = member.profiles as
      | RoomParticipantProfile
      | RoomParticipantProfile[]
      | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

    return {
      userId: member.user_id,
      displayName: profile?.display_name || "Thành viên",
      avatarUrl: profile?.avatar_url || null,
      role: member.role,
    };
  });
}
