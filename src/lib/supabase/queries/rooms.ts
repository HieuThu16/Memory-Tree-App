import type { MemoryParticipant, RoomRecord, RoomSummary } from "@/lib/types";
import { createSupabaseServerClient } from "../server";

type ProfileLookupRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

async function getProfilesByIds(
  userIds: string[],
): Promise<Map<string, ProfileLookupRecord>> {
  if (!userIds.length) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  if (error) {
    console.error("Failed to load profiles", error.message);
    return new Map();
  }

  return new Map(
    ((data ?? []) as ProfileLookupRecord[]).map(
      (profile) => [profile.id, profile] as const,
    ),
  );
}

async function getActiveInviteCodesByRoomIds(
  roomIds: string[],
): Promise<Map<string, string>> {
  if (!roomIds.length) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_invites")
    .select("room_id, code")
    .in("room_id", roomIds)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load room invites", error.message);
    return new Map();
  }

  return new Map((data ?? []).map((invite) => [invite.room_id, invite.code]));
}

export async function getUserRooms(): Promise<RoomSummary[]> {
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
  const inviteCodesByRoomId = await getActiveInviteCodesByRoomIds(roomIds);

  const { data: rooms, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
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
        .select("user_id")
        .eq("room_id", room.id);

      const memberUserIds = (membersInfo ?? []).map((member) => member.user_id);
      const profilesById = await getProfilesByIds(memberUserIds);

      const count = membersInfo?.length ?? 0;

      const otherMembers = (membersInfo ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => {
          return profilesById.get(m.user_id)?.display_name || "Khách ẩn danh";
        });

      const sharedMemberCount = (membersInfo ?? []).filter(
        (member) => member.user_id !== room.created_by,
      ).length;

      return {
        ...room,
        invite_code: inviteCodesByRoomId.get(room.id) ?? null,
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
  const { data: invite, error: inviteError } = await supabase
    .from("room_invites")
    .select("room_id, code")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (inviteError || !invite) {
    return null;
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
    .eq("id", invite.room_id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    invite_code: invite.code,
  };
}

export async function getRoomInviteCode(
  roomId: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("room_invites")
    .select("code")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load active invite code", error.message);
    return null;
  }

  return data?.code ?? null;
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
    .select("user_id, role")
    .eq("room_id", roomId);

  if (error) {
    console.error("Failed to load room participants", error.message);
    return [];
  }

  const profilesById = await getProfilesByIds(
    (data ?? []).map((member) => member.user_id),
  );

  return (data ?? []).map((member) => {
    const profile = profilesById.get(member.user_id);

    return {
      userId: member.user_id,
      displayName: profile?.display_name || "Thành viên",
      avatarUrl: profile?.avatar_url || null,
      role: member.role,
    };
  });
}

/**
 * Lấy danh sách bạn bè của một user (những người cùng chung ít nhất 1 phòng)
 */
export async function getUserFriends(
  userId: string,
): Promise<MemoryParticipant[]> {
  const supabase = await createSupabaseServerClient();

  // Lấy các phòng mà user đang tham gia
  const { data: memberships, error: memberError } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId);

  if (memberError || !memberships?.length) return [];

  const roomIds = memberships.map((m) => m.room_id);

  // Lấy các thành viên khác trong các phòng đó
  const { data: friendsData, error: friendsError } = await supabase
    .from("room_members")
    .select("user_id, role")
    .in("room_id", roomIds)
    .neq("user_id", userId);

  if (friendsError || !friendsData?.length) return [];

  // Lọc trùng lặp user_id (trường hợp cùng chung nhiều phòng)
  const uniqueFriendsMap = new Map();
  for (const f of friendsData) {
    if (!uniqueFriendsMap.has(f.user_id)) {
      uniqueFriendsMap.set(f.user_id, f);
    }
  }
  const uniqueFriends = Array.from(uniqueFriendsMap.values());

  const profilesById = await getProfilesByIds(
    uniqueFriends.map((f) => f.user_id),
  );

  return uniqueFriends.map((friend) => {
    const profile = profilesById.get(friend.user_id);
    return {
      userId: friend.user_id,
      displayName: profile?.display_name || "Thành viên",
      avatarUrl: profile?.avatar_url || null,
      role: friend.role,
    };
  });
}

/**
 * Kiểm tra xem 2 user có phải là bạn bè không (bằng cách check xem có chung room_id nào không)
 */
export async function checkAreFriends(
  userId1: string,
  userId2: string,
): Promise<boolean> {
  if (userId1 === userId2) return false;
  const supabase = await createSupabaseServerClient();

  // Lấy danh sách room của người 1
  const { data, error } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId1);

  if (error || !data || data.length === 0) return false;

  const roomIds = data.map((m) => m.room_id);

  // Xem người 2 có nằm trong bất kỳ room nào của người 1 không
  const { data: sharedRooms, error: sharedError } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId2)
    .in("room_id", roomIds)
    .limit(1);

  return !sharedError && sharedRooms && sharedRooms.length > 0;
}
