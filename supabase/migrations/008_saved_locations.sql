-- Migration: Thêm bảng lưu vị trí định danh (Nhà, Trọ, Trường,...)
-- Run this in Supabase SQL Editor

create table if not exists saved_locations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  lat float8 not null,
  lng float8 not null,
  label text not null,
  created_at timestamptz default now()
);

alter table saved_locations enable row level security;

create policy "Room members can view and manage saved locations"
  on saved_locations for all
  using (
    exists (
      select 1 from room_members rm
      where rm.room_id = saved_locations.room_id
        and rm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from room_members rm
      where rm.room_id = saved_locations.room_id
        and rm.user_id = auth.uid()
    )
  );

-- Enable Realtime for saved_locations to sync instantly between users
alter publication supabase_realtime add table saved_locations;
