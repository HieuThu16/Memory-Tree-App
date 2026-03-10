export type MemoryType = "diary" | "photo" | "video" | "album";

export type MemoryRecord = {
  id: string;
  user_id: string;
  room_id: string | null;
  parent_id: string | null;
  title: string;
  content: string | null;
  date: string | null;
  type: MemoryType;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  media?: MediaRecord[];
};

export type MediaRecord = {
  id: string;
  memory_id: string;
  storage_path: string;
  media_type: string | null;
  thumbnail: string | null;
  duration: number | null;
  created_at: string;
};

export type RoomRecord = {
  id: string;
  name: string | null;
  invite_code: string;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
};

export type RoomMemberRecord = {
  room_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
};

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMemoryInput = {
  title: string;
  content?: string;
  type: MemoryType;
  date?: string;
  room_id?: string | null;
  parent_id?: string | null;
};
