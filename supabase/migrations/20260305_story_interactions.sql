-- Migration for Story Interactions and Direct Messages (Inbox)

-- 1. Create story_views table
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- RLS for story_views
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert story_views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select views of their own stories"
  ON story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- 2. Add read_at to direct_messages
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 3. Add UPDATE policy for direct_messages so receivers can mark as read
-- We will drop if exists to avoid errors, then create
DO $$
BEGIN
  DROP POLICY IF EXISTS "Receivers can update direct_messages" ON direct_messages;
EXCEPTION
  WHEN undefined_object THEN
    null;
END $$;

CREATE POLICY "Receivers can update direct_messages"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 4. Create an RPC to safely mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_sender_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE direct_messages
  SET read_at = now()
  WHERE sender_id = p_sender_id
    AND receiver_id = auth.uid()
    AND read_at IS NULL;
END;
$$;
