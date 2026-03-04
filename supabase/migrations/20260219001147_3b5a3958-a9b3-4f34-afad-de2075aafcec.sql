-- Create workout_bookmarks table for saving others' shared workouts
CREATE TABLE public.workout_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workout_id)
);

-- Enable RLS
ALTER TABLE public.workout_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own workout bookmarks"
ON public.workout_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark workouts"
ON public.workout_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove workout bookmarks"
ON public.workout_bookmarks FOR DELETE
USING (auth.uid() = user_id);