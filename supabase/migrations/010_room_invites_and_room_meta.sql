alter table public.rooms
  add column if not exists shared_address text,
  add column if not exists shared_playlist_url text;

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id) on delete cascade not null,
  code text unique not null,
  is_active boolean not null default true,
  created_by uuid references auth.users (id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists room_invites_active_room_idx
  on public.room_invites (room_id)
  where is_active;

insert into public.room_invites (room_id, code, created_by, created_at)
select rooms.id, rooms.invite_code, rooms.created_by, coalesce(rooms.created_at, now())
from public.rooms
where rooms.invite_code is not null
on conflict (code) do nothing;

alter table public.room_invites enable row level security;

drop policy if exists "room_invites_select_member" on public.room_invites;
create policy "room_invites_select_member" on public.room_invites
  for select using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.room_members rm
      where rm.room_id = room_invites.room_id
        and rm.user_id = auth.uid()
    )
  );

drop policy if exists "room_invites_insert_owner" on public.room_invites;
create policy "room_invites_insert_owner" on public.room_invites
  for insert with check (created_by = auth.uid());

drop policy if exists "room_invites_update_owner" on public.room_invites;
create policy "room_invites_update_owner" on public.room_invites
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "room_invites_delete_owner" on public.room_invites;
create policy "room_invites_delete_owner" on public.room_invites
  for delete using (created_by = auth.uid());

drop function if exists public.join_room_by_code(text);

create or replace function public.join_room_by_code(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room_id uuid;
  room_owner uuid;
  normalized_code text;
  member_total integer;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập trước khi tham gia khu vườn.';
  end if;

  normalized_code := upper(trim(invite_code_input));

  if normalized_code is null or normalized_code = '' then
    raise exception 'Mã mời không hợp lệ.';
  end if;

  select room_invites.room_id, rooms.created_by
    into target_room_id, room_owner
  from public.room_invites
  join public.rooms on rooms.id = room_invites.room_id
  where room_invites.code = normalized_code
    and room_invites.is_active
  limit 1;

  if target_room_id is null then
    raise exception 'Mã mời phòng không tồn tại hoặc không hợp lệ.';
  end if;

  if room_owner = auth.uid() then
    raise exception 'Bạn không thể tham gia chính khu vườn mình tạo.';
  end if;

  select count(*)
    into member_total
  from public.room_members
  where room_members.room_id = target_room_id;

  if member_total >= 2 and not exists (
    select 1
    from public.room_members
    where room_members.room_id = target_room_id
      and room_members.user_id = auth.uid()
  ) then
    raise exception 'Khu vườn này đã đủ 2 người.';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (target_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do update
    set joined_at = public.room_members.joined_at;

  return target_room_id;
end;
$$;

grant execute on function public.join_room_by_code(text) to authenticated;