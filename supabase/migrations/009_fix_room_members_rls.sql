-- Fix circular RLS on room_members

-- 1. Create a security definer function to get rooms user is part of
CREATE OR REPLACE FUNCTION public.get_my_rooms()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT room_id FROM public.room_members WHERE user_id = auth.uid();
$$;

-- 2. Drop the old policy that caused infinite recursion / failure
DROP POLICY IF EXISTS "room_members_select" ON public.room_members;

-- 3. Create the new policy that uses the function
CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (
    room_id IN (SELECT public.get_my_rooms())
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
