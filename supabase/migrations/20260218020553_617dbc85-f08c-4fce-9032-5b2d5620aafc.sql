
-- 1. Create a public_profiles view exposing only non-sensitive fields
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT user_id, name, avatar_url, goal
FROM public.profiles;

-- 2. Drop the overly permissive public read policy on profiles
DROP POLICY IF EXISTS "Profiles are publicly readable for social" ON public.profiles;

-- 3. Keep owner + trainer access only on the base table (existing policies remain)
