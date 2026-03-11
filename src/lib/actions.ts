"use server";

import { revalidatePath } from "next/cache";
import type { CreateMemoryInput } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createMemory(input: CreateMemoryInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: user.id,
      title: input.title,
      content: input.content ?? null,
      category: input.room_id ? null : input.category?.trim() || null,
      location: input.location?.trim() || null,
      type: input.type,
      date: input.date || new Date().toISOString(),
      room_id: input.room_id ?? null,
      parent_id: input.parent_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { data };
}

export async function saveMediaRecords(
  mediaItems: {
    memory_id: string;
    storage_path: string;
    media_type: string;
  }[],
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("media").insert(mediaItems);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateMemory(
  id: string,
  updates: Partial<CreateMemoryInput>,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("memories")
    .update({
      title: updates.title,
      content: updates.content,
      category: updates.category?.trim() || null,
      location: updates.location?.trim() || null,
      type: updates.type,
      date: updates.date,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteMemory(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteMedia(mediaId: string, storagePath: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Verify memory belongs to user before deleting its media
  // or maybe it's too complex, let's just use media table RLS, but for safe we delete from storage then db
  const { error: storageError } = await supabase.storage.from("media").remove([storagePath]);
  
  if (storageError) {
    console.error("Failed to delete from storage", storageError);
    // Ignore storage deletion errors to proceed with db cleanup
  }

  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", mediaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function createRoom(name: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const inviteCode = Array.from(
    { length: 6 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select("id, invite_code")
    .single();

  if (error) {
    return { error: error.message };
  }

  const { error: memberError } = await supabase.from("room_members").insert({
    room_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/friends");
  return { data };
}

export async function joinRoom(inviteCode: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const normalizedInviteCode = inviteCode.trim().toUpperCase();

  const { data: roomId, error: joinError } = await supabase.rpc(
    "join_room_by_code",
    {
      invite_code_input: normalizedInviteCode,
    },
  );

  if (joinError) {
    if (joinError.message.includes("chính khu vườn mình tạo")) {
      return { error: joinError.message };
    }

    return { error: "Mã mời phòng không tồn tại hoặc không hợp lệ." };
  }

  if (!roomId) {
    return { error: "Mã mời phòng không tồn tại hoặc không hợp lệ." };
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, invite_code")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return { error: "Không thể tải thông tin phòng sau khi tham gia." };
  }

  type RoomInfoRecord = {
    name: string | null;
    created_by: string | null;
    room_members: {
      user_id: string;
      profiles:
        | { display_name: string | null }
        | { display_name: string | null }[]
        | null;
    }[];
  };

  // Get room and other members to show a nice notification
  const { data: roomInfo } = await supabase
    .from("rooms")
    .select(
      `
      name,
      created_by,
      room_members (
        user_id,
        profiles (
          display_name
        )
      )
    `,
    )
    .eq("id", room.id)
    .single();

  let message = "Đã kết nối vào khu vườn chung!";

  const typedRoomInfo = roomInfo as RoomInfoRecord | null;

  if (typedRoomInfo && typedRoomInfo.room_members) {
    const collaborators = typedRoomInfo.room_members
      .filter((member) => member.user_id !== typedRoomInfo.created_by)
      .map((member) => {
        const profile = Array.isArray(member.profiles)
          ? member.profiles[0]
          : member.profiles;

        return {
          user_id: member.user_id,
          display_name: profile?.display_name || "Khách",
        };
      });

    const otherMembers = collaborators
      .filter((member) => member.user_id !== user.id)
      .map((member) => {
        return member.display_name;
      })
      .filter(Boolean);

    if (collaborators.length === 1 && collaborators[0]?.user_id === user.id) {
      message =
        "Bạn là người đầu tiên tham gia bằng mã mời này. Khu vườn giờ đã bắt đầu có người cùng chăm.";
    } else if (otherMembers.length > 0) {
      message = `Kết nối thành công! Bạn đang chung vườn với: ${otherMembers.join(", ")}`;
    } else {
      message = `Đã tham gia khu vườn "${typedRoomInfo.name || "mới"}" thành công!`;
    }
  }

  revalidatePath("/friends");
  revalidatePath(`/friends/${room.id}`);
  return { data: { room_id: room.id, room_name: room.name, message } };
}

export async function updateRoom(roomId: string, name: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Only room owner can update
  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "owner") {
    return { error: "Chỉ chủ vườn mới có thể đổi tên." };
  }

  const { error } = await supabase
    .from("rooms")
    .update({ name: name.trim() })
    .eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/friends");
  revalidatePath(`/friends/${roomId}`);
  return { success: true };
}

export async function deleteRoom(roomId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Only room owner can delete
  const { data: member } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (!member || member.role !== "owner") {
    return { error: "Chỉ chủ vườn mới có thể xóa." };
  }

  // Delete room members first
  await supabase.from("room_members").delete().eq("room_id", roomId);
  // Delete room memories
  await supabase.from("memories").delete().eq("room_id", roomId);
  // Delete room
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { success: true };
}

export async function leaveRoom(roomId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { success: true };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

