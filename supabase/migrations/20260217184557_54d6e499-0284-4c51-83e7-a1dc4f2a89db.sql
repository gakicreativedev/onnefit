
-- ══════════════════════════════════════════════
-- 1. Workout History (completed workouts + load tracking)
-- ══════════════════════════════════════════════
CREATE TABLE public.workout_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_minutes INTEGER,
  notes TEXT
);

ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout history" ON public.workout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout history" ON public.workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout history" ON public.workout_history FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  history_id UUID NOT NULL REFERENCES public.workout_history(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL DEFAULT 0,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise logs" ON public.exercise_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM workout_history WHERE workout_history.id = exercise_logs.history_id AND workout_history.user_id = auth.uid()));
CREATE POLICY "Users can insert own exercise logs" ON public.exercise_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workout_history WHERE workout_history.id = exercise_logs.history_id AND workout_history.user_id = auth.uid()));
CREATE POLICY "Users can delete own exercise logs" ON public.exercise_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM workout_history WHERE workout_history.id = exercise_logs.history_id AND workout_history.user_id = auth.uid()));

-- ══════════════════════════════════════════════
-- 2. XP System
-- ══════════════════════════════════════════════
CREATE TABLE public.user_xp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'workout_completed', 'diet_logged', 'streak_bonus', 'water_goal'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp" ON public.user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 3. Streaks
-- ══════════════════════════════════════════════
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);
