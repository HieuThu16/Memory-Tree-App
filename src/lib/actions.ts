"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import webpush from "web-push";
import type {
  CreateMemoryInput,
  MemoryEditHistoryRecord,
  MemoryRecord,
  MusicSearchResult,
  PlaylistRecord,
  PlaylistTrackRecord,
  RoomSummary,
  CommentRecord,
  CommentWithAuthor,
} from "@/lib/types";
import { MEMORY_SELECT, PLAYLIST_SELECT } from "@/lib/supabase/selects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MEMORY_SELECT_LEGACY =
  "id, user_id, room_id, parent_id, title, content, category, location, date, type, position_x, position_y, created_at, media(id, memory_id, storage_path, media_type, thumbnail, duration, created_at)";

type StoredPushSubscription = {
  user_id: string;
  room_id: string | null;
  subscription: string;
};

type BrowserPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
};

type PushError = {
  statusCode?: number;
};

type MemoryMutationRecord = {
  id: string;
  user_id: string;
  room_id: string | null;
  parent_id: string | null;
  title: string;
  content: string | null;
  category: string | null;
  with_whom: string | null;
  event_time: string | null;
  location: string | null;
  date: string | null;
  type: MemoryRecord["type"];
  created_at: string;
};

const isMissingMetadataColumn = (message?: string) => {
  if (!message) return false;
  const lowered = message.toLowerCase();
  return (
    lowered.includes("column") &&
    (lowered.includes("with_whom") || lowered.includes("event_time"))
  );
};

function generateInviteCode(length = 6) {
  return Array.from(
    { length },
    () =>
      INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)],
  ).join("");
}

const memoryFieldLabels: Record<string, string> = {
  title: "tiêu đề",
  content: "nội dung",
  category: "thể loại",
  with_whom: "với ai",
  event_time: "giờ",
  location: "địa điểm",
  date: "ngày",
  type: "loại",
};

type MemoryComparableField = keyof typeof memoryFieldLabels;

async function getCurrentUserDisplayName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
) {
  const profileResult = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    profileResult.data?.display_name ??
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ??
    user.email ??
    "Một người dùng"
  );
}

async function getMemoryForMutation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  memoryId: string,
) {
  const primarySelect =
    "id, user_id, room_id, parent_id, title, content, category, with_whom, event_time, location, date, type, created_at";
  const legacySelect =
    "id, user_id, room_id, parent_id, title, content, category, location, date, type, created_at";

  const { data, error } = await supabase
    .from("memories")
    .select(primarySelect)
    .eq("id", memoryId)
    .single();

  if (!error && data) {
    return data as MemoryMutationRecord;
  }

  if (!isMissingMetadataColumn(error?.message)) {
    return null;
  }

  const legacyResult = await supabase
    .from("memories")
    .select(legacySelect)
    .eq("id", memoryId)
    .single();

  if (legacyResult.error || !legacyResult.data) {
    return null;
  }

  return {
    ...(legacyResult.data as Omit<
      MemoryMutationRecord,
      "with_whom" | "event_time"
    >),
    with_whom: null,
    event_time: null,
  };
}

async function canEditMemory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  memory: { user_id: string; room_id: string | null },
) {
  if (!memory.room_id) {
    return memory.user_id === userId;
  }

  const { data: membership } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", memory.room_id)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(membership);
}

async function getFullMemoryRecord(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  memoryId: string,
) {
  const primaryResult = await supabase
    .from("memories")
    .select(MEMORY_SELECT)
    .eq("id", memoryId)
    .single();

  if (!primaryResult.error && primaryResult.data) {
    return primaryResult.data as MemoryRecord;
  }

  if (!isMissingMetadataColumn(primaryResult.error?.message)) {
    return null;
  }

  const legacyResult = await supabase
    .from("memories")
    .select(MEMORY_SELECT_LEGACY)
    .eq("id", memoryId)
    .single();

  if (legacyResult.error || !legacyResult.data) {
    return null;
  }

  return {
    ...(legacyResult.data as Omit<MemoryRecord, "with_whom" | "event_time">),
    with_whom: null,
    event_time: null,
  };
}

function formatComparableValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}

let webPushConfigured = false;
const getVapidConfig = () => {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    return null;
  }

  return { subject, publicKey, privateKey };
};

const configureWebPush = () => {
  if (webPushConfigured) return true;
  const config = getVapidConfig();
  if (!config) return false;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  webPushConfigured = true;
  return true;
};

const parseStoredSubscription = (raw: string): webpush.PushSubscription | null => {
  try {
    const parsed = JSON.parse(raw) as BrowserPushSubscription;
    if (!parsed?.endpoint) return null;

    return {
      endpoint: parsed.endpoint,
      expirationTime: parsed.expirationTime ?? null,
      keys: {
        auth: parsed.keys?.auth ?? "",
        p256dh: parsed.keys?.p256dh ?? "",
      },
    };
  } catch {
    return null;
  }
};

const toLegacyMemoryPayload = (payload: Record<string, unknown>) => {
  const legacyPayload = { ...payload };
  delete legacyPayload.with_whom;
  delete legacyPayload.event_time;
  return legacyPayload;
};

async function notifyRoomMembersForNewMemory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  currentUserId: string,
  roomId: string,
  memoryTitle: string,
) {
  if (!configureWebPush()) {
    return;
  }

  const senderNameResult = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", currentUserId)
    .maybeSingle();

  const senderName = senderNameResult.data?.display_name ?? "Người ấy";

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, room_id, subscription")
    .eq("room_id", roomId)
    .neq("user_id", currentUserId);

  if (!subscriptions?.length) {
    return;
  }

  const payload = JSON.stringify({
    title: "Kỷ niệm mới vừa được thêm",
    body: `${senderName} vừa thêm: ${memoryTitle}`,
    url: `/friends/${roomId}`,
    icon: "/icon-tree-192.png",
    badge: "/icon-tree-192.png",
  });

  await Promise.all(
    (subscriptions as StoredPushSubscription[]).map(async (row) => {
      const parsed = parseStoredSubscription(row.subscription);
      if (!parsed) return;

      try {
        await webpush.sendNotification(parsed, payload);
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number((error as PushError).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", row.user_id);
        }
      }
    }),
  );
}

export async function createMemory(input: CreateMemoryInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    title: input.title,
    content: input.content ?? null,
    category: input.room_id ? null : input.category?.trim() || null,
    with_whom: input.with_whom?.trim() || null,
    event_time: input.event_time?.trim() || null,
    location: input.location?.trim() || null,
    type: input.type,
    date: input.date || new Date().toISOString(),
    room_id: input.room_id ?? null,
    parent_id: input.parent_id ?? null,
  };

  const { data, error } = await supabase
    .from("memories")
    .insert(payload)
    .select(MEMORY_SELECT)
    .single();

  if (error) {
    if (isMissingMetadataColumn(error.message)) {
      // Retry without metadata columns
      const legacyPayload = toLegacyMemoryPayload(payload);
      const { data: legacyData, error: legacyError } = await supabase
        .from("memories")
        .insert(legacyPayload)
        .select(MEMORY_SELECT_LEGACY)
        .single();

      if (legacyError) {
        return { error: legacyError.message };
      }

      if (input.room_id) {
        await notifyRoomMembersForNewMemory(
          supabase,
          user.id,
          input.room_id,
          input.title,
        );
      }

      revalidatePath("/", "layout");
      return { data: { memory: legacyData as MemoryRecord } };
    }
    return { error: error.message };
  }

  if (input.room_id) {
    await notifyRoomMembersForNewMemory(
      supabase,
      user.id,
      input.room_id,
      input.title,
    );
  }

  revalidatePath("/", "layout");
  return { data: { memory: data } };
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

  const existingMemory = await getMemoryForMutation(supabase, id);

  if (!existingMemory) {
    return { error: "Không tìm thấy kỉ niệm cần sửa." };
  }

  if (!(await canEditMemory(supabase, user.id, existingMemory))) {
    return { error: "Bạn không có quyền sửa kỉ niệm này." };
  }

  const payload = {
    title: updates.title?.trim(),
    content: updates.content?.trim() || null,
    category: updates.category?.trim() || null,
    with_whom: updates.with_whom?.trim() || null,
    event_time: updates.event_time?.trim() || null,
    location: updates.location?.trim() || null,
    type: updates.type,
    date: updates.date,
  };

  const comparableBefore: Record<MemoryComparableField, string | null> = {
    title: formatComparableValue(existingMemory.title),
    content: formatComparableValue(existingMemory.content),
    category: formatComparableValue(existingMemory.category),
    with_whom: formatComparableValue(existingMemory.with_whom),
    event_time: formatComparableValue(existingMemory.event_time),
    location: formatComparableValue(existingMemory.location),
    type: formatComparableValue(existingMemory.type),
    date: formatComparableValue(existingMemory.date),
  };

  const comparableAfter: Record<MemoryComparableField, string | null> = {
    title: payload.title ?? comparableBefore.title,
    content:
      updates.content !== undefined
        ? payload.content
        : comparableBefore.content,
    category:
      updates.category !== undefined
        ? payload.category
        : comparableBefore.category,
    with_whom:
      updates.with_whom !== undefined
        ? payload.with_whom
        : comparableBefore.with_whom,
    event_time:
      updates.event_time !== undefined
        ? payload.event_time
        : comparableBefore.event_time,
    location:
      updates.location !== undefined
        ? payload.location
        : comparableBefore.location,
    type:
      updates.type !== undefined
        ? formatComparableValue(payload.type)
        : comparableBefore.type,
    date:
      updates.date !== undefined
        ? formatComparableValue(payload.date)
        : comparableBefore.date,
  };

  const changedFields = (
    Object.keys(memoryFieldLabels) as MemoryComparableField[]
  )
    .filter((field) => comparableBefore[field] !== comparableAfter[field])
    .map((field) => [field, memoryFieldLabels[field]] as const);

  if (!changedFields.length) {
    const fullMemory = await getFullMemoryRecord(supabase, id);
    return { data: { memory: fullMemory, historyEntries: [] } };
  }

  const { error } = await supabase
    .from("memories")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (isMissingMetadataColumn(error.message)) {
      const legacyPayload = toLegacyMemoryPayload(
        payload as unknown as Record<string, unknown>,
      );
      const { error: legacyError } = await supabase
        .from("memories")
        .update(legacyPayload)
        .eq("id", id);

      if (legacyError) {
        return { error: legacyError.message };
      }
    } else {
      return { error: error.message };
    }
  }

  const editorName = await getCurrentUserDisplayName(supabase, user);
  const historyRows = changedFields.map(([fieldName]) => ({
    memory_id: id,
    room_id: existingMemory.room_id,
    edited_by: user.id,
    editor_name_snapshot: editorName,
    field_name: fieldName,
    before_value: comparableBefore[fieldName],
    after_value: comparableAfter[fieldName],
  }));

  const insertedHistory = historyRows.length
    ? await supabase.from("memory_edit_history").insert(historyRows).select("*")
    : { data: [] as MemoryEditHistoryRecord[], error: null };

  if (insertedHistory.error) {
    return { error: insertedHistory.error.message };
  }

  const fullMemory = await getFullMemoryRecord(supabase, id);

  revalidatePath("/", "layout");
  return {
    success: true,
    data: {
      memory: fullMemory,
      historyEntries: (insertedHistory.data ?? []) as MemoryEditHistoryRecord[],
    },
  };
}

export async function deleteMemory(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const existingMemory = await getMemoryForMutation(supabase, id);

  if (!existingMemory) {
    return { error: "Không tìm thấy kỉ niệm cần xóa." };
  }

  if (existingMemory.user_id !== user.id) {
    return { error: "Chỉ người tạo mới có thể xóa kỉ niệm này." };
  }

  const { error } = await supabase.from("memories").delete().eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: { id } };
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
  const { error: storageError } = await supabase.storage
    .from("media")
    .remove([storagePath]);

  if (storageError) {
    console.error("Failed to delete from storage", storageError);
    // Ignore storage deletion errors to proceed with db cleanup
  }

  const { error } = await supabase.from("media").delete().eq("id", mediaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function createRoom(input: {
  name: string;
  sharedPlaylistUrl?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const inviteCode = generateInviteCode();

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: input.name,
      shared_playlist_url: input.sharedPlaylistUrl?.trim() || null,
      created_by: user.id,
    })
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  const { error: inviteError } = await supabase.from("room_invites").insert({
    room_id: data.id,
    code: inviteCode,
    created_by: user.id,
  });

  if (inviteError) {
    return { error: inviteError.message };
  }

  const { error: memberError } = await supabase.from("room_members").insert({
    room_id: data.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  const room: RoomSummary = {
    ...data,
    invite_code: inviteCode,
    member_count: 1,
    other_members: [],
    shared_member_count: 0,
    is_shared: false,
    invite_only: true,
  };

  revalidatePath("/friends");
  return { data: { room } };
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

    if (joinError.message.includes("đủ 2 người")) {
      return { error: "Khu vườn này đã đủ 2 người." };
    }

    return { error: "Mã mời phòng không tồn tại hoặc không hợp lệ." };
  }

  if (!roomId) {
    return { error: "Mã mời phòng không tồn tại hoặc không hợp lệ." };
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return { error: "Không thể tải thông tin phòng sau khi tham gia." };
  }

  const { data: inviteData } = await supabase
    .from("room_invites")
    .select("code")
    .eq("room_id", room.id)
    .eq("is_active", true)
    .maybeSingle();

  const { data: roomInfo } = await supabase
    .from("rooms")
    .select("name, created_by")
    .eq("id", room.id)
    .single();

  const { data: roomMembers } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id);

  const memberUserIds = (roomMembers ?? []).map((member) => member.user_id);
  let profiles: { id: string; display_name: string | null }[] = [];

  if (memberUserIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberUserIds);

    profiles = (data ?? []) as { id: string; display_name: string | null }[];
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile] as const),
  );

  let message = "Đã kết nối vào khu vườn chung!";

  if (roomInfo && roomMembers) {
    const collaborators = roomMembers
      .filter((member) => member.user_id !== roomInfo.created_by)
      .map((member) => ({
        user_id: member.user_id,
        display_name: profilesById.get(member.user_id)?.display_name || "Khách",
      }));

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
      message = `Đã tham gia khu vườn "${roomInfo.name || "mới"}" thành công!`;
    }
  }

  revalidatePath("/friends");
  revalidatePath(`/friends/${room.id}`);
  return {
    data: {
      room_id: room.id,
      room_name: room.name,
      message,
      room: {
        ...room,
        invite_code: inviteData?.code ?? null,
        member_count: roomMembers?.length ?? 0,
        other_members:
          roomMembers
            ?.filter((member) => member.user_id !== user.id)
            .map(
              (member) =>
                profilesById.get(member.user_id)?.display_name ||
                "Khách ẩn danh",
            ) ?? [],
        shared_member_count:
          roomMembers?.filter((member) => member.user_id !== room.created_by)
            .length ?? 0,
        is_shared:
          (roomMembers?.filter((member) => member.user_id !== room.created_by)
            .length ?? 0) > 0,
        invite_only:
          (roomMembers?.filter((member) => member.user_id !== room.created_by)
            .length ?? 0) === 0,
      } satisfies RoomSummary,
    },
  };
}

export async function updateRoom(
  roomId: string,
  updates: {
    name?: string;
    sharedPlaylistUrl?: string | null;
  },
) {
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

  const updatePayload: {
    name?: string;
    shared_playlist_url?: string | null;
  } = {};

  if (typeof updates.name === "string") {
    updatePayload.name = updates.name.trim();
  }

  if (updates.sharedPlaylistUrl !== undefined) {
    updatePayload.shared_playlist_url =
      updates.sharedPlaylistUrl?.trim() || null;
  }

  const { error } = await supabase
    .from("rooms")
    .update(updatePayload)
    .eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, created_by, shared_playlist_url, expires_at, created_at")
    .eq("id", roomId)
    .single();

  revalidatePath("/friends");
  revalidatePath(`/friends/${roomId}`);
  return {
    success: true,
    data: room
      ? {
          ...room,
        }
      : null,
  };
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
  redirect("/login");
}

export async function createPlaylist(input: {
  roomId?: string | null;
  name: string;
  description?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      room_id: input.roomId ?? null,
      created_by: user.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .select(PLAYLIST_SELECT)
    .single();

  if (error) {
    return { error: error.message };
  }

  if (input.roomId) {
    revalidatePath(`/friends/${input.roomId}`);
  }

  return { data: data as PlaylistRecord };
}

export async function updatePlaylist(
  playlistId: string,
  updates: { name?: string; description?: string | null },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: existingPlaylist } = await supabase
    .from("playlists")
    .select("room_id")
    .eq("id", playlistId)
    .single();

  const { data, error } = await supabase
    .from("playlists")
    .update({
      name: updates.name?.trim(),
      description: updates.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playlistId)
    .select(PLAYLIST_SELECT)
    .single();

  if (error) {
    return { error: error.message };
  }

  if (existingPlaylist?.room_id) {
    revalidatePath(`/friends/${existingPlaylist.room_id}`);
  }

  return { data: data as PlaylistRecord };
}

export async function deletePlaylist(playlistId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: playlist } = await supabase
    .from("playlists")
    .select("room_id")
    .eq("id", playlistId)
    .single();

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) {
    return { error: error.message };
  }

  if (playlist?.room_id) {
    revalidatePath(`/friends/${playlist.room_id}`);
  }

  return { success: true, data: { id: playlistId } };
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: MusicSearchResult,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: playlist } = await supabase
    .from("playlists")
    .select("id, room_id")
    .eq("id", playlistId)
    .single();

  if (!playlist) {
    return { error: "Playlist không tồn tại." };
  }

  const { data: lastTrack } = await supabase
    .from("playlist_tracks")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("playlist_tracks")
    .upsert(
      {
        playlist_id: playlistId,
        source: track.source,
        source_track_id: track.source_track_id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork_url: track.artwork_url,
        preview_url: track.preview_url,
        external_url: track.external_url,
        duration_ms: track.duration_ms,
        position: (lastTrack?.position ?? -1) + 1,
        metadata: {
          source: track.source,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "playlist_id,source,source_track_id" },
    )
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (playlist.room_id) {
    revalidatePath(`/friends/${playlist.room_id}`);
  }

  return { data: data as PlaylistTrackRecord };
}

export async function removeTrackFromPlaylist(trackId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: track } = await supabase
    .from("playlist_tracks")
    .select("id, playlist_id, playlists(room_id)")
    .eq("id", trackId)
    .single();

  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("id", trackId);

  if (error) {
    return { error: error.message };
  }

  const roomId = Array.isArray(track?.playlists)
    ? ((track.playlists[0] as { room_id: string | null } | undefined)
        ?.room_id ?? null)
    : null;

  if (roomId) {
    revalidatePath(`/friends/${roomId}`);
  }

  return {
    success: true,
    data: { id: trackId, playlist_id: track?.playlist_id ?? null },
  };
}

// ─── COMMENT CRUD ────────────────────────────────────────────────────

const COMMENT_SELECT =
  "id, memory_id, user_id, room_id, content, created_at, updated_at, comment_media(id, comment_id, storage_path, media_type, created_at)";

export async function fetchComments(
  memoryId: string,
): Promise<{ data: CommentWithAuthor[]; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: "Not authenticated" };
  }

  const { data: comments, error } = await supabase
    .from("memory_comments")
    .select(COMMENT_SELECT)
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  if (!comments || comments.length === 0) {
    return { data: [] };
  }

  // Fetch author profiles
  const userIds = [...new Set(comments.map((c: CommentRecord) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map(
      (p: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      }) => [p.id, p],
    ),
  );

  const enriched: CommentWithAuthor[] = (comments as CommentRecord[]).map(
    (c) => {
      const profile = profileMap.get(c.user_id);
      return {
        ...c,
        author_name: profile?.display_name ?? "Ẩn danh",
        author_avatar: profile?.avatar_url ?? null,
      };
    },
  );

  return { data: enriched };
}

export async function createComment(input: {
  memoryId: string;
  content: string;
  roomId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("memory_comments")
    .insert({
      memory_id: input.memoryId,
      user_id: user.id,
      room_id: input.roomId ?? null,
      content: input.content.trim(),
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return { error: error.message };
  }

  const displayName = await getCurrentUserDisplayName(supabase, user);

  const enriched: CommentWithAuthor = {
    ...(data as CommentRecord),
    author_name: displayName,
    author_avatar: null,
  };

  return { data: enriched };
}

export async function updateComment(commentId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("memory_comments")
    .update({
      content: content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("user_id", user.id)
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as CommentRecord };
}

export async function deleteComment(commentId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Delete associated media from storage first
  const { data: mediaItems } = await supabase
    .from("comment_media")
    .select("storage_path")
    .eq("comment_id", commentId);

  if (mediaItems && mediaItems.length > 0) {
    const storagePaths = mediaItems.map(
      (m: { storage_path: string }) => m.storage_path,
    );
    await supabase.storage.from("media").remove(storagePaths);
  }

  const { error } = await supabase
    .from("memory_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: { id: commentId } };
}

export async function saveCommentMedia(
  items: {
    comment_id: string;
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

  const { error } = await supabase.from("comment_media").insert(items);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
