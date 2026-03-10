create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  invite_code text unique not null,
  created_by uuid references auth.users (id),
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.room_members (
  room_id uuid references public.rooms (id) on delete cascade,
  user_id uuid references auth.users (id) not null,
  role text default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

create index if not exists room_members_user_id_idx on public.room_members (user_id);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;

create policy "rooms_select_member" on public.rooms
  for select using (
    created_by = auth.uid() or
    exists (
      select 1
      from public.room_members
      where room_members.room_id = rooms.id
        and room_members.user_id = auth.uid()
    )
  );

create policy "rooms_insert_owner" on public.rooms
  for insert with check (created_by = auth.uid());

create policy "rooms_update_owner" on public.rooms
  for update using (created_by = auth.uid());

create policy "rooms_delete_owner" on public.rooms
  for delete using (created_by = auth.uid());

create policy "room_members_select" on public.room_members
  for select using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_members.room_id
        and rm.user_id = auth.uid()
    )
  );

create policy "room_members_insert_self" on public.room_members
  for insert with check (user_id = auth.uid());

create policy "room_members_delete_self" on public.room_members
  for delete using (user_id = auth.uid());

alter table public.memories
  add constraint memories_room_id_fkey
  foreign key (room_id)
  references public.rooms (id)
  on delete set null;

create policy "memories_room_select" on public.memories
  for select using (
    room_id is not null and room_id in (
      select room_members.room_id
      from public.room_members
      where room_members.user_id = auth.uid()
    )
  );

create policy "memories_room_insert" on public.memories
  for insert with check (
    room_id is not null and room_id in (
      select room_members.room_id
      from public.room_members
      where room_members.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );
