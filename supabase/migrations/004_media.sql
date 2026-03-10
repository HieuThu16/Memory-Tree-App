create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.memories (id) on delete cascade,
  storage_path text not null,
  media_type text,
  thumbnail text,
  duration int,
  created_at timestamptz default now()
);

create index if not exists media_memory_id_idx on public.media (memory_id);

alter table public.media enable row level security;

create policy "media_select" on public.media
  for select using (
    exists (
      select 1
      from public.memories
      where memories.id = media.memory_id
        and (
          memories.user_id = auth.uid()
          or memories.room_id in (
            select room_members.room_id
            from public.room_members
            where room_members.user_id = auth.uid()
          )
        )
    )
  );

create policy "media_insert" on public.media
  for insert with check (
    exists (
      select 1
      from public.memories
      where memories.id = media.memory_id
        and memories.user_id = auth.uid()
    )
  );

create policy "media_update" on public.media
  for update using (
    exists (
      select 1
      from public.memories
      where memories.id = media.memory_id
        and memories.user_id = auth.uid()
    )
  );

create policy "media_delete" on public.media
  for delete using (
    exists (
      select 1
      from public.memories
      where memories.id = media.memory_id
        and memories.user_id = auth.uid()
    )
  );
