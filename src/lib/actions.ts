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

  revalidatePath("/");
  return { data };
}

export async function saveMediaRecords(
  mediaItems: {
    memory_id: string;
    storage_path: string;
    media_type: string;
  }[]
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

  revalidatePath("/");
  return { success: true };
}

export async function updateMemory(
  id: string,
  updates: Partial<CreateMemoryInput>
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
      type: updates.type,
      date: updates.date,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
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

  revalidatePath("/");
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
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
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

  await supabase.from("room_members").insert({
    room_id: data.id,
    user_id: user.id,
    role: "owner",
  });

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

  const { data: roomId, error } = await supabase.rpc("join_room_by_code", {
    invite_code: inviteCode.toUpperCase(),
  });

  if (error || !roomId) {
    return { error: "Mã mời phòng không tồn tại hoặc không hợp lệ." };
  }

  // Get room and other members to show a nice notification
  const { data: roomInfo } = await supabase
    .from("rooms")
    .select(`
      name,
      room_members (
        user_id,
        profiles (
          display_name
        )
      )
    `)
    .eq("id", roomId)
    .single();

  let message = "Đã kết nối vào khu vườn chung!";
  
  if (roomInfo && roomInfo.room_members) {
    const members = roomInfo.room_members
      .filter((m: any) => m.user_id !== user.id)
      .map((m: any) => m.profiles?.display_name || "Khách")
      .filter(Boolean);
      
    if (members.length > 0) {
      message = `Kết nối thành công! Bạn đang chung vườn với: ${members.join(", ")}`;
    } else {
      message = `Đã tham gia khu vườn "${roomInfo.name || "mới"}" thành công!`;
    }
  }

  revalidatePath("/friends");
  return { data: { room_id: roomId, message } };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
