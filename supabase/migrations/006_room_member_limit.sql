create or replace function public.enforce_room_member_limit()
returns trigger
language plpgsql
as $$
declare
  member_total integer;
begin
  select count(*)
  into member_total
  from public.room_members
  where room_members.room_id = new.room_id;

  if member_total >= 2 then
    raise exception 'Khu vườn này đã đủ 2 người.';
  end if;

  return new;
end;
$$;

drop trigger if exists room_member_limit_trigger on public.room_members;

create trigger room_member_limit_trigger
before insert on public.room_members
for each row
execute function public.enforce_room_member_limit();

drop function if exists public.join_room_by_code(text);

create or replace function public.join_room_by_code(invite_code_input text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
  target_room_id uuid;
  target_room_owner_id uuid;
  existing_membership boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  normalized_code := upper(trim(invite_code_input));

  select rooms.id, rooms.created_by
  into target_room_id, target_room_owner_id
  from public.rooms
  where rooms.invite_code = normalized_code
  limit 1;

  if target_room_id is null then
    return null;
  end if;

  if target_room_owner_id = auth.uid() then
    raise exception 'Bạn không thể dùng mã mời của chính khu vườn mình tạo.';
  end if;

  select exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
  )
  into existing_membership;

  if existing_membership then
    return target_room_id;
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (target_room_id, auth.uid(), 'member');

  return target_room_id;
end;
$$;

grant execute on function public.join_room_by_code(text) to authenticated;