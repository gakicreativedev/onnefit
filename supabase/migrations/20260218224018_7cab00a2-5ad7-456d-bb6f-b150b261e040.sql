-- Story reactions table
CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can react to stories" ON public.story_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on own stories" ON public.story_reactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stories WHERE stories.id = story_reactions.story_id AND stories.user_id = auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON public.story_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Direct messages table
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Only mutual followers can send DMs (checked via function)
CREATE OR REPLACE FUNCTION public.are_mutual_followers(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_a AND f1.following_id = user_b
  );
$$;

CREATE POLICY "Mutual followers can send DMs" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.are_mutual_followers(auth.uid(), receiver_id));

CREATE POLICY "Users can view own DMs" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update own received DMs" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

-- Make notifications.post_id nullable so we can use it for story reactions too
ALTER TABLE public.notifications ALTER COLUMN post_id DROP NOT NULL;

-- Enable realtime for DMs
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;