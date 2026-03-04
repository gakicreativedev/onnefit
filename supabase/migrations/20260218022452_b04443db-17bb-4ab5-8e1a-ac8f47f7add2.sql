
-- Remove the overly broad authenticated read policy
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
