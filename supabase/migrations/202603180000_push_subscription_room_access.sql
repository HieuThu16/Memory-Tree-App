-- Allow room members to read push subscriptions for delivering memory notifications.
do $$
begin
  if to_regclass('public.push_subscriptions') is null then
    raise notice 'Skip migration 202603180000: table public.push_subscriptions does not exist yet.';
    return;
  end if;

  alter table public.push_subscriptions
    add column if not exists room_id uuid;

  create index if not exists push_subscriptions_room_id_idx
    on public.push_subscriptions(room_id);

  drop policy if exists "Room members can read push subscriptions" on public.push_subscriptions;
  create policy "Room members can read push subscriptions"
    on public.push_subscriptions for select
    using (
      auth.uid() = user_id
      or (
        room_id is not null
        and exists (
          select 1
          from public.room_members rm
          where rm.room_id = push_subscriptions.room_id
            and rm.user_id = auth.uid()
        )
      )
    );
end $$;
