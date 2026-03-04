-- Allow trainers to view profiles of their linked students
CREATE POLICY "Trainers can view student profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_students
    WHERE trainer_students.trainer_id = auth.uid()
      AND trainer_students.student_id = profiles.user_id
  )
);