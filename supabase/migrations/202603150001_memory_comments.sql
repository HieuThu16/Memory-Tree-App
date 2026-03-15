-- Memory Comments table with full CRUD support
CREATE TABLE IF NOT EXISTS public.memory_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment media (images/videos attached to comments)
CREATE TABLE IF NOT EXISTS public.comment_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.memory_comments(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT, -- 'image' or 'video'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_id ON public.memory_comments(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_comments_user_id ON public.memory_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_media_comment_id ON public.comment_media(comment_id);

-- RLS Policies for memory_comments
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on memories they can access
CREATE POLICY "Users can read comments on accessible memories"
  ON public.memory_comments FOR SELECT
  USING (
    -- Own memory
    EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.memory_comments.memory_id
      AND (
        m.user_id = auth.uid()
        OR m.room_id IN (
          SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can insert comments on memories they can access
CREATE POLICY "Users can insert comments"
  ON public.memory_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.memories m
      WHERE m.id = public.memory_comments.memory_id
      AND (
        m.user_id = auth.uid()
        OR m.room_id IN (
          SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.memory_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.memory_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS for comment_media
ALTER TABLE public.comment_media ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the comment can see its media
CREATE POLICY "Users can read comment media"
  ON public.comment_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memory_comments mc
      JOIN public.memories m ON m.id = mc.memory_id
      WHERE mc.id = public.comment_media.comment_id
      AND (
        m.user_id = auth.uid()
        OR m.room_id IN (
          SELECT rm.room_id FROM public.room_members rm WHERE rm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can insert media on their own comments
CREATE POLICY "Users can insert comment media"
  ON public.comment_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memory_comments mc
      WHERE mc.id = public.comment_media.comment_id
      AND mc.user_id = auth.uid()
    )
  );

-- Users can delete media on their own comments
CREATE POLICY "Users can delete comment media"
  ON public.comment_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.memory_comments mc
      WHERE mc.id = public.comment_media.comment_id
      AND mc.user_id = auth.uid()
    )
  );

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_media;
