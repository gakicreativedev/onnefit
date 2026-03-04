
-- Recreate public_profiles view with username field
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker=on) AS
  SELECT user_id, name, avatar_url, goal, username
  FROM public.profiles;
