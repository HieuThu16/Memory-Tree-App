-- Enable Realtime for memories and push_subscriptions
alter publication supabase_realtime add table public.memories;
alter publication supabase_realtime add table public.push_subscriptions;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.rooms;
