-- Add women_only flag to posts and stories
ALTER TABLE public.posts ADD COLUMN women_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.stories ADD COLUMN women_only boolean NOT NULL DEFAULT false;

-- Security definer function to check if a user is female (avoids exposing gender)
CREATE OR REPLACE FUNCTION public.is_female(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND gender = 'female'
  );
$$;

-- Drop existing SELECT policies on posts and stories to replace them
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
DROP POLICY IF EXISTS "Active stories are publicly readable" ON public.stories;

-- New SELECT policy for posts: women_only posts only visible to female users (or the author)
CREATE POLICY "Posts are readable with gender filter"
ON public.posts FOR SELECT
USING (
  CASE
    WHEN women_only = true THEN
      auth.uid() = user_id OR public.is_female(auth.uid())
    ELSE true
  END
);

-- New SELECT policy for stories: women_only stories only visible to female users (or the author)
CREATE POLICY "Active stories readable with gender filter"
ON public.stories FOR SELECT
USING (
  expires_at > now() AND
  CASE
    WHEN women_only = true THEN
      user_id = auth.uid() OR public.is_female(auth.uid())
    ELSE true
  END
);