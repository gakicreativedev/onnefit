
-- Add bio field and username change tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamptz[] DEFAULT '{}';

-- Update public_profiles view to include bio
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
SELECT user_id, name, username, avatar_url, goal, bio
FROM public.profiles;
