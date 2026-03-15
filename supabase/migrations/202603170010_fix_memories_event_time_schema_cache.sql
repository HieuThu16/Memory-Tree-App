-- Ensure memory metadata columns exist even if previous migration was skipped,
-- then force PostgREST schema cache reload.
do $$
begin
  if to_regclass('public.memories') is null then
    raise notice 'Skip migration 202603170010: table public.memories does not exist yet.';
  else
    execute 'alter table public.memories
      add column if not exists with_whom text,
      add column if not exists event_time time';

    execute 'comment on column public.memories.with_whom is ''Who the memory was shared with''';
    execute 'comment on column public.memories.event_time is ''Optional local time of the memory event''';

    execute 'create index if not exists memories_event_time_idx on public.memories(event_time)';

    notify pgrst, 'reload schema';
  end if;
end $$;
