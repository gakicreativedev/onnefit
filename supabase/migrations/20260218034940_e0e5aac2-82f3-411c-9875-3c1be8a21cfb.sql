
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_profiles_username ON public.profiles (username);
