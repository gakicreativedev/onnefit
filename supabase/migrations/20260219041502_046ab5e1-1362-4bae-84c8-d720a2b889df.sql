
-- Add is_private column to profiles
ALTER TABLE public.profiles ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Add status column to follows (pending or accepted)
ALTER TABLE public.follows ADD COLUMN status text NOT NULL DEFAULT 'accepted';

-- Update the public_profiles view to include is_private
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker=on) AS
  SELECT user_id, name, username, avatar_url, bio, goal, is_verified, is_private
  FROM public.profiles;

-- Update RLS on follows: only show accepted follows for non-owners
DROP POLICY IF EXISTS "Follows are publicly readable" ON public.follows;
CREATE POLICY "Follows are publicly readable"
  ON public.follows FOR SELECT
  USING (status = 'accepted' OR follower_id = auth.uid() OR following_id = auth.uid());

-- Update the insert policy: if target is private, status must be 'pending'
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Allow users to update follow status (accept/reject requests)
CREATE POLICY "Users can accept follow requests"
  ON public.follows FOR UPDATE
  USING (following_id = auth.uid() AND status = 'pending');

-- Create a function to check if user can see private profile content
CREATE OR REPLACE FUNCTION public.is_approved_follower(viewer_id uuid, profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = viewer_id
      AND following_id = profile_owner_id
      AND status = 'accepted'
  );
$$;
