
-- Fix 1: Allow students to accept/reject trainer requests
CREATE POLICY "Students can update relationship status"
ON public.trainer_students FOR UPDATE
USING (auth.uid() = student_id)
WITH CHECK (
  auth.uid() = student_id AND
  status IN ('active', 'inactive')
);

CREATE POLICY "Students can reject trainer requests"
ON public.trainer_students FOR DELETE
USING (
  auth.uid() = student_id AND
  status = 'pending'
);

-- Add status constraint
ALTER TABLE public.trainer_students
ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'inactive'));

-- Fix 2: Remove self-update on user_roles (prevent privilege escalation)
DROP POLICY "Users can update own role" ON public.user_roles;

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.get_user_role(auth.uid()) = 'admin');

-- Fix 3: Require authentication for profile reads (replace public policy)
DROP POLICY IF EXISTS "Profiles are publicly readable for social" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL);
