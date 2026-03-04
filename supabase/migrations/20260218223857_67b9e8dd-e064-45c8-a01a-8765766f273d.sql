-- Allow admins to update any profile (needed for verification toggle)
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin'::app_role)
WITH CHECK (public.get_user_role(auth.uid()) = 'admin'::app_role);