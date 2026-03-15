-- Add dedicated metadata fields for memory social context and event time
alter table public.memories
  add column if not exists with_whom text,
  add column if not exists event_time time;

comment on column public.memories.with_whom is 'Who the memory was shared with';
comment on column public.memories.event_time is 'Optional local time of the memory event';

create index if not exists memories_event_time_idx on public.memories(event_time);
