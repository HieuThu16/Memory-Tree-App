-- Migration: Add location tracking tables
-- Run this in Supabase SQL Editor

-- 1. Real-time location (upserted continuously)
create table if not exists user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  room_id uuid not null,
  lat float8 not null,
  lng float8 not null,
  accuracy float4,
  heading float4,
  speed float4,
  updated_at timestamptz default now(),
  unique(user_id, room_id)
);

-- 2. Location history (inserted when moved >20m)
create table if not exists location_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  room_id uuid not null,
  lat float8 not null,
  lng float8 not null,
  recorded_at timestamptz default now()
);

-- 3. Push notification subscriptions (for web push)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  room_id uuid,
  subscription text not null,
  updated_at timestamptz default now()
);

-- RLS Policies

alter table user_locations enable row level security;
alter table location_history enable row level security;
alter table push_subscriptions enable row level security;

-- user_locations: members of the same room can read/write
create policy "Room members can view locations"
  on user_locations for select
  using (
    exists (
      select 1 from room_members rm
      where rm.room_id = user_locations.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "Users can upsert own location"
  on user_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- location_history: same room members can read; user can insert own
create policy "Room members can view history"
  on location_history for select
  using (
    exists (
      select 1 from room_members rm
      where rm.room_id = location_history.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "Users can insert own history"
  on location_history for insert
  with check (auth.uid() = user_id);

-- push_subscriptions: user manages own
create policy "Users can manage own push sub"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enable Realtime on user_locations
alter publication supabase_realtime add table user_locations;

-- Index for performance
create index if not exists idx_user_locations_room on user_locations(room_id);
create index if not exists idx_location_history_user_room on location_history(user_id, room_id, recorded_at desc);
