
-- Add is_shared flag to workouts
ALTER TABLE public.workouts ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Add is_shared flag to meal_plans
ALTER TABLE public.meal_plans ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Allow users to create their own recipes (not just admins) with sharing
ALTER TABLE public.recipes ADD COLUMN is_shared boolean NOT NULL DEFAULT false;

-- Update workouts SELECT policy: own + shared by others
DROP POLICY IF EXISTS "Workouts are publicly readable" ON public.workouts;
CREATE POLICY "Users can view own or shared workouts" ON public.workouts FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

-- Update meal_plans SELECT policy: own + shared by others
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plans;
CREATE POLICY "Users can view own or shared meal plans" ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

-- Update recipes: allow any authenticated user to insert their own
DROP POLICY IF EXISTS "Admins can insert recipes" ON public.recipes;
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Update recipes SELECT: own + shared + admin recipes
DROP POLICY IF EXISTS "Recipes are publicly readable" ON public.recipes;
CREATE POLICY "Users can view own or shared recipes" ON public.recipes FOR SELECT
  USING (auth.uid() = created_by OR is_shared = true OR public.get_user_role(auth.uid()) = 'admin');

-- Allow users to update/delete their own recipes
DROP POLICY IF EXISTS "Admins can update recipes" ON public.recipes;
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE
  USING (auth.uid() = created_by OR public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete recipes" ON public.recipes;
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE
  USING (auth.uid() = created_by OR public.get_user_role(auth.uid()) = 'admin');

-- meals should also be visible if the meal_plan is shared
DROP POLICY IF EXISTS "Users can view own meals" ON public.meals;
CREATE POLICY "Users can view own or shared meals" ON public.meals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans 
    WHERE id = meals.meal_plan_id AND (user_id = auth.uid() OR is_shared = true)
  ));

-- workout_exercises should also be visible if workout is shared
DROP POLICY IF EXISTS "Workout exercises are publicly readable" ON public.workout_exercises;
CREATE POLICY "Users can view own or shared workout exercises" ON public.workout_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts 
    WHERE id = workout_exercises.workout_id AND (user_id = auth.uid() OR is_shared = true)
  ));
