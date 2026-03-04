
-- Allow authenticated users to read any profile (needed for social features via view + direct queries)
-- The public_profiles view limits which columns are exposed
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
