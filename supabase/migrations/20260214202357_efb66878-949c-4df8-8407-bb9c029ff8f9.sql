
-- ============================================
-- FitSoul MVP Database Schema
-- ============================================

-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT CHECK (goal IN ('lose_weight', 'gain_muscle', 'maintain')),
  bmr NUMERIC,
  calorie_target NUMERIC,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Workouts table (public predefined data)
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[],
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workouts are publicly readable" ON public.workouts FOR SELECT USING (true);

-- 3. Workout exercises
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 12,
  rest_seconds INTEGER DEFAULT 60,
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workout exercises are publicly readable" ON public.workout_exercises FOR SELECT USING (true);

-- 4. Meal plans (user-specific)
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calories NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meal plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- 5. Meals
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_time TEXT CHECK (meal_time IN ('breakfast', 'lunch', 'snack', 'dinner')),
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE meal_plans.id = meals.meal_plan_id AND meal_plans.user_id = auth.uid())
);
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE meal_plans.id = meals.meal_plan_id AND meal_plans.user_id = auth.uid())
);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE meal_plans.id = meals.meal_plan_id AND meal_plans.user_id = auth.uid())
);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.meal_plans WHERE meal_plans.id = meals.meal_plan_id AND meal_plans.user_id = auth.uid())
);

-- 6. User activity tracking
CREATE TABLE public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_completed BOOLEAN DEFAULT false,
  water_intake_ml INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON public.user_activity FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity" ON public.user_activity FOR DELETE USING (auth.uid() = user_id);

-- 7. Seed predefined workouts
INSERT INTO public.workouts (name, description, muscle_groups, difficulty, duration_minutes) VALUES
  ('Full Body Burn', 'A complete full body workout for beginners', ARRAY['chest', 'back', 'legs', 'shoulders'], 'beginner', 30),
  ('Upper Body Power', 'Focus on chest, back, and arms', ARRAY['chest', 'back', 'biceps', 'triceps'], 'intermediate', 35),
  ('Leg Day', 'Intense lower body session', ARRAY['quadriceps', 'hamstrings', 'glutes', 'calves'], 'beginner', 30);

-- Exercises for Full Body Burn
INSERT INTO public.workout_exercises (workout_id, exercise_name, sets, reps, rest_seconds, sort_order)
SELECT w.id, e.exercise_name, e.sets, e.reps, e.rest_seconds, e.sort_order
FROM public.workouts w
CROSS JOIN (VALUES
  ('Push-ups', 3, 15, 60, 1),
  ('Bodyweight Squats', 3, 20, 60, 2),
  ('Dumbbell Rows', 3, 12, 60, 3),
  ('Lunges', 3, 12, 60, 4),
  ('Plank', 3, 30, 45, 5),
  ('Jumping Jacks', 3, 20, 30, 6)
) AS e(exercise_name, sets, reps, rest_seconds, sort_order)
WHERE w.name = 'Full Body Burn';

-- Exercises for Upper Body Power
INSERT INTO public.workout_exercises (workout_id, exercise_name, sets, reps, rest_seconds, sort_order)
SELECT w.id, e.exercise_name, e.sets, e.reps, e.rest_seconds, e.sort_order
FROM public.workouts w
CROSS JOIN (VALUES
  ('Bench Press', 4, 10, 90, 1),
  ('Pull-ups', 3, 8, 90, 2),
  ('Overhead Press', 3, 10, 60, 3),
  ('Barbell Rows', 3, 12, 60, 4),
  ('Bicep Curls', 3, 12, 45, 5),
  ('Tricep Dips', 3, 15, 45, 6)
) AS e(exercise_name, sets, reps, rest_seconds, sort_order)
WHERE w.name = 'Upper Body Power';

-- Exercises for Leg Day
INSERT INTO public.workout_exercises (workout_id, exercise_name, sets, reps, rest_seconds, sort_order)
SELECT w.id, e.exercise_name, e.sets, e.reps, e.rest_seconds, e.sort_order
FROM public.workouts w
CROSS JOIN (VALUES
  ('Barbell Squats', 4, 10, 90, 1),
  ('Romanian Deadlifts', 3, 12, 90, 2),
  ('Leg Press', 3, 15, 60, 3),
  ('Walking Lunges', 3, 12, 60, 4),
  ('Calf Raises', 4, 15, 45, 5),
  ('Leg Curls', 3, 12, 45, 6)
) AS e(exercise_name, sets, reps, rest_seconds, sort_order)
WHERE w.name = 'Leg Day';
