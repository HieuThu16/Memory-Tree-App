export type MemoryType = "diary" | "photo" | "video" | "album";

export type MemoryRecord = {
  id: string;
  user_id: string;
  room_id: string | null;
  parent_id: string | null;
  title: string;
  content: string | null;
  category: string | null;
  date: string | null;
  type: MemoryType;
  location: string | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  media?: MediaRecord[];
};

export type MemoryEditHistoryRecord = {
  id: string;
  memory_id: string;
  room_id: string | null;
  edited_by: string;
  editor_name_snapshot: string | null;
  field_name: string;
  before_value: string | null;
  after_value: string | null;
  created_at: string;
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
  invite_code: string | null;
  created_by: string | null;
  shared_playlist_url: string | null;
  expires_at: string | null;
  created_at: string;
};

export type RoomInviteRecord = {
  id: string;
  room_id: string;
  code: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RoomSummary = RoomRecord & {
  member_count: number;
  other_members: string[];
  shared_member_count: number;
  is_shared: boolean;
  invite_only: boolean;
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

export type MemoryParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role?: "owner" | "member";
};

export type CreateMemoryInput = {
  title: string;
  content?: string;
  category?: string;
  type: MemoryType;
  date?: string;
  location?: string | null;
  room_id?: string | null;
  parent_id?: string | null;
};

export type PlaylistRecord = {
  id: string;
  room_id: string | null;
  created_by: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  tracks?: PlaylistTrackRecord[];
};

export type PlaylistTrackRecord = {
  id: string;
  playlist_id: string;
  source: string;
  source_track_id: string;
  title: string;
  artist: string | null;
  album: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  external_url: string | null;
  duration_ms: number | null;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MusicSearchResult = {
  source: string;
  source_track_id: string;
  title: string;
  artist: string | null;
  album: string | null;
  artwork_url: string | null;
  preview_url: string | null;
  external_url: string | null;
  duration_ms: number | null;
};
