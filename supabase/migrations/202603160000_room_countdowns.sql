-- Countdown dates table (per room)
create table if not exists public.room_countdowns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date timestamptz not null,
  emoji text default '🎯',
  is_passed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.room_countdowns enable row level security;

-- Members of the room can see countdowns
create policy "Room members can view countdowns"
  on public.room_countdowns for select
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_countdowns.room_id
        and rm.user_id = auth.uid()
    )
  );

-- Members of the room can insert countdowns
create policy "Room members can insert countdowns"
  on public.room_countdowns for insert
  with check (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_countdowns.room_id
        and rm.user_id = auth.uid()
    )
    and added_by = auth.uid()
  );

-- Members can update their own countdowns or any in the room
create policy "Room members can update countdowns"
  on public.room_countdowns for update
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_countdowns.room_id
        and rm.user_id = auth.uid()
    )
  );

-- Members can delete countdowns in their room
create policy "Room members can delete countdowns"
  on public.room_countdowns for delete
  using (
    exists (
      select 1 from public.room_members rm
      where rm.room_id = room_countdowns.room_id
        and rm.user_id = auth.uid()
    )
  );

-- Enable realtime
alter publication supabase_realtime add table public.room_countdowns;

-- Indexes
create index idx_room_countdowns_room_id on public.room_countdowns(room_id);
create index idx_room_countdowns_target_date on public.room_countdowns(target_date);
