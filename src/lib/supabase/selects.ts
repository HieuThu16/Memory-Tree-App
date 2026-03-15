export const MEMORY_SELECT =
  "id, user_id, room_id, parent_id, title, content, category, with_whom, event_time, location, date, type, position_x, position_y, created_at, media(id, memory_id, storage_path, media_type, thumbnail, duration, created_at)";

export const MEMORY_SELECT_LEGACY =
  "id, user_id, room_id, parent_id, title, content, category, location, date, type, position_x, position_y, created_at, media(id, memory_id, storage_path, media_type, thumbnail, duration, created_at)";

export const PLAYLIST_SELECT =
  "id, room_id, created_by, name, description, created_at, updated_at, tracks:playlist_tracks(id, playlist_id, source, source_track_id, title, artist, album, artwork_url, preview_url, external_url, duration_ms, position, metadata, created_at, updated_at)";
