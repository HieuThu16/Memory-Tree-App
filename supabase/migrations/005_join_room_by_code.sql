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

  insert into public.room_members (room_id, user_id, role)
  values (target_room_id, auth.uid(), 'member')
  on conflict (room_id, user_id) do update
    set joined_at = public.room_members.joined_at;

  return target_room_id;
end;
$$;

grant execute on function public.join_room_by_code(text) to authenticated;