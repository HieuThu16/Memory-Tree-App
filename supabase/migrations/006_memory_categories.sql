alter table public.memories
  add column if not exists category text;

create index if not exists memories_category_idx
  on public.memories (category)
  where room_id is null and category is not null;