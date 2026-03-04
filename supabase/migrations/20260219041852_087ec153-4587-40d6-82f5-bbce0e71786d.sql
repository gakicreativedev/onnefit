
-- Update are_mutual_followers to only consider accepted follows
CREATE OR REPLACE FUNCTION public.are_mutual_followers(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_a AND f1.following_id = user_b
      AND f1.status = 'accepted' AND f2.status = 'accepted'
  );
$$;
