
-- Add servings column to recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS servings integer DEFAULT 1;

-- Create community foods table
CREATE TABLE IF NOT EXISTS public.community_foods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  calories_kcal numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  serving_size text NOT NULL DEFAULT '100g',
  category text NOT NULL DEFAULT 'geral',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_foods ENABLE ROW LEVEL SECURITY;

-- Public foods visible to all authenticated users
CREATE POLICY "Public foods visible to authenticated users"
ON public.community_foods FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own community foods"
ON public.community_foods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own community foods"
ON public.community_foods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own community foods"
ON public.community_foods FOR DELETE
USING (auth.uid() = user_id);

-- Create cardio sessions table
CREATE TABLE IF NOT EXISTS public.cardio_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'caminhada',
  duration_minutes integer NOT NULL DEFAULT 0,
  distance_km numeric,
  calories_burned integer,
  notes text,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cardio sessions"
ON public.cardio_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cardio sessions"
ON public.cardio_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cardio sessions"
ON public.cardio_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cardio sessions"
ON public.cardio_sessions FOR DELETE
USING (auth.uid() = user_id);
