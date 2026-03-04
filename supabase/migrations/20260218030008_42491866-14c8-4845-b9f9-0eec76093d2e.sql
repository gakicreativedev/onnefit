
-- Fix: Replace overly permissive "Likes are publicly readable" with auth-scoped policy
DROP POLICY "Likes are publicly readable" ON public.post_likes;

-- Allow authenticated users to view likes (needed for like counts and recent likers)
CREATE POLICY "Authenticated users can view likes"
ON public.post_likes FOR SELECT
USING (auth.uid() IS NOT NULL);
