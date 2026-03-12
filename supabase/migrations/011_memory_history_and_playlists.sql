create table if not exists public.memory_edit_history (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.memories (id) on delete cascade not null,
  room_id uuid references public.rooms (id) on delete cascade,
  edited_by uuid references auth.users (id) not null,
  editor_name_snapshot text,
  field_name text not null,
  before_value text,
  after_value text,
  created_at timestamptz default now()
);

create index if not exists memory_edit_history_memory_id_idx
  on public.memory_edit_history (memory_id, created_at desc);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id) on delete cascade,
  created_by uuid references auth.users (id) not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists playlists_room_id_idx on public.playlists (room_id);
create index if not exists playlists_created_by_idx on public.playlists (created_by);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references public.playlists (id) on delete cascade not null,
  source text not null,
  source_track_id text not null,
  title text not null,
  artist text,
  album text,
  artwork_url text,
  preview_url text,
  external_url text,
  duration_ms integer,
  position integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (playlist_id, source, source_track_id)
);

create index if not exists playlist_tracks_playlist_id_idx
  on public.playlist_tracks (playlist_id, position asc, created_at asc);

alter table public.memory_edit_history enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;

drop policy if exists "memories_room_update_member" on public.memories;
create policy "memories_room_update_member" on public.memories
  for update using (
    room_id is not null
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = memories.room_id
        and rm.user_id = auth.uid()
    )
  )
  with check (
    room_id is not null
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = memories.room_id
        and rm.user_id = auth.uid()
    )
  );

drop policy if exists "memory_edit_history_select_visible_memory" on public.memory_edit_history;
create policy "memory_edit_history_select_visible_memory" on public.memory_edit_history
  for select using (
    exists (
      select 1
      from public.memories m
      where m.id = memory_edit_history.memory_id
        and (
          (m.room_id is null and m.user_id = auth.uid())
          or (
            m.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = m.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "memory_edit_history_insert_visible_memory" on public.memory_edit_history;
create policy "memory_edit_history_insert_visible_memory" on public.memory_edit_history
  for insert with check (
    edited_by = auth.uid()
    and exists (
      select 1
      from public.memories m
      where m.id = memory_edit_history.memory_id
        and (
          (m.room_id is null and m.user_id = auth.uid())
          or (
            m.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = m.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "playlists_select_visible" on public.playlists;
create policy "playlists_select_visible" on public.playlists
  for select using (
    (room_id is null and created_by = auth.uid())
    or (
      room_id is not null
      and exists (
        select 1
        from public.room_members rm
        where rm.room_id = playlists.room_id
          and rm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "playlists_insert_visible" on public.playlists;
create policy "playlists_insert_visible" on public.playlists
  for insert with check (
    created_by = auth.uid()
    and (
      room_id is null
      or exists (
        select 1
        from public.room_members rm
        where rm.room_id = playlists.room_id
          and rm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "playlists_update_visible" on public.playlists;
create policy "playlists_update_visible" on public.playlists
  for update using (
    (room_id is null and created_by = auth.uid())
    or (
      room_id is not null
      and exists (
        select 1
        from public.room_members rm
        where rm.room_id = playlists.room_id
          and rm.user_id = auth.uid()
      )
    )
  )
  with check (
    (room_id is null and created_by = auth.uid())
    or (
      room_id is not null
      and exists (
        select 1
        from public.room_members rm
        where rm.room_id = playlists.room_id
          and rm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "playlists_delete_visible" on public.playlists;
create policy "playlists_delete_visible" on public.playlists
  for delete using (
    (room_id is null and created_by = auth.uid())
    or (
      room_id is not null
      and exists (
        select 1
        from public.room_members rm
        where rm.room_id = playlists.room_id
          and rm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "playlist_tracks_select_visible" on public.playlist_tracks;
create policy "playlist_tracks_select_visible" on public.playlist_tracks
  for select using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_tracks.playlist_id
        and (
          (p.room_id is null and p.created_by = auth.uid())
          or (
            p.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = p.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "playlist_tracks_insert_visible" on public.playlist_tracks;
create policy "playlist_tracks_insert_visible" on public.playlist_tracks
  for insert with check (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_tracks.playlist_id
        and (
          (p.room_id is null and p.created_by = auth.uid())
          or (
            p.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = p.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "playlist_tracks_update_visible" on public.playlist_tracks;
create policy "playlist_tracks_update_visible" on public.playlist_tracks
  for update using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_tracks.playlist_id
        and (
          (p.room_id is null and p.created_by = auth.uid())
          or (
            p.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = p.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_tracks.playlist_id
        and (
          (p.room_id is null and p.created_by = auth.uid())
          or (
            p.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = p.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );

drop policy if exists "playlist_tracks_delete_visible" on public.playlist_tracks;
create policy "playlist_tracks_delete_visible" on public.playlist_tracks
  for delete using (
    exists (
      select 1
      from public.playlists p
      where p.id = playlist_tracks.playlist_id
        and (
          (p.room_id is null and p.created_by = auth.uid())
          or (
            p.room_id is not null
            and exists (
              select 1
              from public.room_members rm
              where rm.room_id = p.room_id
                and rm.user_id = auth.uid()
            )
          )
        )
    )
  );