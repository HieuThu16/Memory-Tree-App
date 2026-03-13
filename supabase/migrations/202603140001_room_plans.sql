do $$
begin
  if to_regclass('public.rooms') is null then
    create table public.rooms (
      id uuid primary key default gen_random_uuid(),
      name text,
      invite_code text unique not null,
      created_by uuid references auth.users (id),
      expires_at timestamptz,
      created_at timestamptz default now()
    );
  end if;

  if to_regclass('public.room_members') is null then
    create table public.room_members (
      room_id uuid references public.rooms (id) on delete cascade,
      user_id uuid references auth.users (id) not null,
      role text default 'member' check (role in ('owner','member')),
      joined_at timestamptz default now(),
      primary key (room_id, user_id)
    );

    create index if not exists room_members_user_id_idx
      on public.room_members (user_id);
  end if;
end
$$;

create table if not exists public.room_plans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id) on delete cascade not null,
  added_by uuid references auth.users (id) not null,
  title text not null,
  description text,
  is_completed boolean not null default false,
  completed_by uuid references auth.users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_plans_title_length check (char_length(trim(title)) > 0)
);

create index if not exists room_plans_room_id_idx
  on public.room_plans (room_id, created_at desc);

alter table public.room_plans enable row level security;

drop policy if exists "room_plans_select_room_members" on public.room_plans;
create policy "room_plans_select_room_members" on public.room_plans
  for select using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_plans.room_id
        and rm.user_id = auth.uid()
    )
  );

drop policy if exists "room_plans_insert_room_members" on public.room_plans;
create policy "room_plans_insert_room_members" on public.room_plans
  for insert with check (
    added_by = auth.uid()
    and exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_plans.room_id
        and rm.user_id = auth.uid()
    )
  );

drop policy if exists "room_plans_update_room_members" on public.room_plans;
create policy "room_plans_update_room_members" on public.room_plans
  for update using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_plans.room_id
        and rm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_plans.room_id
        and rm.user_id = auth.uid()
    )
  );

drop policy if exists "room_plans_delete_room_members" on public.room_plans;
create policy "room_plans_delete_room_members" on public.room_plans
  for delete using (
    exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_plans.room_id
        and rm.user_id = auth.uid()
    )
  );

do $$
begin
  alter publication supabase_realtime add table room_plans;
exception
  when duplicate_object then null;
end
$$;
