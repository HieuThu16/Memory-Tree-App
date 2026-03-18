create table if not exists public.global_friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

alter table public.global_friendships enable row level security;

-- Policy to allow authenticated users to view friendships where they are sender or receiver
create policy "global_friendships_select" on public.global_friendships
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy to allow users to send friend requests
create policy "global_friendships_insert" on public.global_friendships
  for insert with check (auth.uid() = sender_id);

-- Policy to allow receiver to update status (accept)
create policy "global_friendships_update" on public.global_friendships
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Policy to allow sender or receiver to delete (unfriend, cancel, reject)
create policy "global_friendships_delete" on public.global_friendships
  for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Trigger for updated_at
create or replace function update_global_friendships_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_global_friendships_modtime
  before update on public.global_friendships
  for each row execute function update_global_friendships_updated_at();

-- Add policy to location tracking: "friends" can view each other's location.
-- Wait, let's update user_locations policies and location_history policies.
-- In `007_location_tracking.sql`, we had "Room members can view locations".
-- Let's add a NEW policy to allow friends to view locations.
create policy "Friends can view locations"
  on public.user_locations for select
  using (
    exists (
      select 1 from public.global_friendships f
      where f.status = 'accepted'
      and (
        (f.sender_id = auth.uid() and f.receiver_id = user_locations.user_id) or
        (f.receiver_id = auth.uid() and f.sender_id = user_locations.user_id)
      )
    )
  );

create policy "Friends can view history"
  on public.location_history for select
  using (
    exists (
      select 1 from public.global_friendships f
      where f.status = 'accepted'
      and (
        (f.sender_id = auth.uid() and f.receiver_id = location_history.user_id) or
        (f.receiver_id = auth.uid() and f.sender_id = location_history.user_id)
      )
    )
  );
