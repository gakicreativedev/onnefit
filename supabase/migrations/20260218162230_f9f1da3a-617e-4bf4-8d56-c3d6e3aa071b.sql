ALTER TABLE public.profiles ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT
  user_id,
  name,
  username,
  avatar_url,
  bio,
  goal,
  is_verified
FROM public.profiles;
