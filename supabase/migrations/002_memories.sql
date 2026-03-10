create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  room_id uuid,
  parent_id uuid references public.memories (id) on delete set null,
  title text not null,
  content text,
  date timestamptz default now(),
  position_x float,
  position_y float,
  type text not null check (type in ('diary','photo','video','album')),
  created_at timestamptz default now()
);

create index if not exists memories_user_id_idx on public.memories (user_id);
create index if not exists memories_room_id_idx on public.memories (room_id);
create index if not exists memories_parent_id_idx on public.memories (parent_id);
create index if not exists memories_date_idx on public.memories (date);

alter table public.memories enable row level security;

create policy "memories_personal_select" on public.memories
  for select using (room_id is null and user_id = auth.uid());

create policy "memories_personal_insert" on public.memories
  for insert with check (room_id is null and user_id = auth.uid());

create policy "memories_owner_update" on public.memories
  for update using (user_id = auth.uid());

create policy "memories_owner_delete" on public.memories
  for delete using (user_id = auth.uid());
