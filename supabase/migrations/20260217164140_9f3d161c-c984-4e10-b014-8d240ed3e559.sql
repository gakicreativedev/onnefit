
-- Add user_id to workouts (nullable for backwards compat with shared/public workouts)
ALTER TABLE public.workouts ADD COLUMN user_id uuid;

-- Users can insert their own workouts
CREATE POLICY "Users can insert own workouts"
ON public.workouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own workouts
CREATE POLICY "Users can update own workouts"
ON public.workouts FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own workouts
CREATE POLICY "Users can delete own workouts"
ON public.workouts FOR DELETE
USING (auth.uid() = user_id);

-- Users can insert exercises for their own workouts
CREATE POLICY "Users can insert own workout exercises"
ON public.workout_exercises FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

-- Users can update exercises for their own workouts
CREATE POLICY "Users can update own workout exercises"
ON public.workout_exercises FOR UPDATE
USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));

-- Users can delete exercises for their own workouts
CREATE POLICY "Users can delete own workout exercises"
ON public.workout_exercises FOR DELETE
USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()));
