
-- ============================================
-- FULL DATABASE RECREATION FROM SCRATCH (v2)
-- ============================================

-- 1. Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_admin_check ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- 2. Drop views
DROP VIEW IF EXISTS public.public_profiles;

-- 3. Drop tables
DROP TABLE IF EXISTS public.exercise_logs CASCADE;
DROP TABLE IF EXISTS public.workout_history CASCADE;
DROP TABLE IF EXISTS public.workout_exercises CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;
DROP TABLE IF EXISTS public.meals CASCADE;
DROP TABLE IF EXISTS public.meal_plans CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.user_xp CASCADE;
DROP TABLE IF EXISTS public.user_streaks CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.post_bookmarks CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.trainer_messages CASCADE;
DROP TABLE IF EXISTS public.trainer_students CASCADE;
DROP TABLE IF EXISTS public.app_updates CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 4. Drop functions
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user_bootstrap();
DROP FUNCTION IF EXISTS public.handle_admin_bootstrap();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- 5. Drop & recreate enum
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('athlete', 'professional', 'admin');

-- ============================================
-- HELPER FUNCTION (no table deps)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================
-- ALL TABLES FIRST
-- ============================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text, username text UNIQUE, age integer, date_of_birth date, gender text,
  height_cm numeric, weight_kg numeric, activity_level text, goal text,
  bmr numeric, calorie_target numeric,
  onboarding_completed boolean NOT NULL DEFAULT false, avatar_url text,
  injuries text[] DEFAULT '{}'::text[], allergies text[] DEFAULT '{}'::text[],
  dietary_restrictions text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'athlete',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0, longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, amount integer NOT NULL, source text NOT NULL,
  description text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
  workout_completed boolean DEFAULT false, water_intake_ml integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, name text NOT NULL, description text,
  muscle_groups text[], difficulty text DEFAULT 'beginner',
  duration_minutes integer DEFAULT 30, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name text NOT NULL, sets integer NOT NULL DEFAULT 3,
  reps integer NOT NULL DEFAULT 12, rest_seconds integer DEFAULT 60, sort_order integer DEFAULT 0
);

CREATE TABLE public.workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  workout_name text NOT NULL, duration_minutes integer, notes text,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id uuid NOT NULL REFERENCES public.workout_history(id) ON DELETE CASCADE,
  exercise_name text NOT NULL, set_number integer NOT NULL DEFAULT 1,
  reps integer NOT NULL DEFAULT 0, weight_kg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, date date NOT NULL DEFAULT CURRENT_DATE,
  total_calories numeric DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name text NOT NULL, meal_time text, calories numeric DEFAULT 0,
  protein numeric DEFAULT 0, carbs numeric DEFAULT 0, fat numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL, following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(follower_id, following_id)
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, content text, image_url text, location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, actor_id uuid NOT NULL, type text NOT NULL,
  post_id uuid NOT NULL, content text, read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE TABLE public.trainer_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL, student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(trainer_id, student_id)
);

CREATE TABLE public.trainer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL, student_id uuid NOT NULL, sender_id uuid NOT NULL,
  content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, content text NOT NULL, category text DEFAULT 'update',
  likes_count integer DEFAULT 0, created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text, ingredients text[] NOT NULL DEFAULT '{}'::text[],
  instructions text, calories integer DEFAULT 0, protein integer DEFAULT 0,
  carbs integer DEFAULT 0, fat integer DEFAULT 0, image_url text,
  category text DEFAULT 'general', created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- FUNCTIONS THAT DEPEND ON TABLES
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_bootstrap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL))
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'athlete') ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak) VALUES (NEW.id, 0, 0) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_admin_bootstrap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email = 'gakicreativegroup@gmail.com' THEN
    UPDATE public.user_roles SET role = 'admin' WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ALL RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Trainers can view student profiles" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = profiles.user_id));

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own role" ON public.user_roles FOR UPDATE USING (auth.uid() = user_id);

-- user_streaks
CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- user_xp
CREATE POLICY "Users can view own xp" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp" ON public.user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_activity
CREATE POLICY "Users can view own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON public.user_activity FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity" ON public.user_activity FOR DELETE USING (auth.uid() = user_id);

-- workouts
CREATE POLICY "Workouts are publicly readable" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- workout_exercises
CREATE POLICY "Workout exercises are publicly readable" ON public.workout_exercises FOR SELECT USING (true);
CREATE POLICY "Users can insert own workout exercises" ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own workout exercises" ON public.workout_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own workout exercises" ON public.workout_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workouts WHERE id = workout_exercises.workout_id AND user_id = auth.uid()));

-- workout_history
CREATE POLICY "Users can view own workout history" ON public.workout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout history" ON public.workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout history" ON public.workout_history FOR DELETE USING (auth.uid() = user_id);

-- exercise_logs
CREATE POLICY "Users can view own exercise logs" ON public.exercise_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_history WHERE id = exercise_logs.history_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own exercise logs" ON public.exercise_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_history WHERE id = exercise_logs.history_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own exercise logs" ON public.exercise_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_history WHERE id = exercise_logs.history_id AND user_id = auth.uid()));

-- meal_plans
CREATE POLICY "Users can view own meal plans" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);

-- meals
CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meals.meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meals.meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meals.meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meals.meal_plan_id AND user_id = auth.uid()));

-- follows
CREATE POLICY "Follows are publicly readable" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- posts
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- post_likes
CREATE POLICY "Authenticated users can view likes" ON public.post_likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can like posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_comments
CREATE POLICY "Comments are publicly readable" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- post_bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.post_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark posts" ON public.post_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON public.post_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- stories
CREATE POLICY "Active stories are publicly readable" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can create own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- trainer_students
CREATE POLICY "Trainers can view own students" ON public.trainer_students FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = student_id);
CREATE POLICY "Trainers can insert students" ON public.trainer_students FOR INSERT
  WITH CHECK (auth.uid() = trainer_id AND public.get_user_role(auth.uid()) = 'professional');
CREATE POLICY "Trainers can update own students" ON public.trainer_students FOR UPDATE USING (auth.uid() = trainer_id);
CREATE POLICY "Trainers can delete own students" ON public.trainer_students FOR DELETE USING (auth.uid() = trainer_id);

-- trainer_messages
CREATE POLICY "Participants can view messages" ON public.trainer_messages FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = student_id);
CREATE POLICY "Participants can send messages" ON public.trainer_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (auth.uid() = trainer_id OR auth.uid() = student_id));

-- app_updates
CREATE POLICY "App updates are publicly readable" ON public.app_updates FOR SELECT USING (true);
CREATE POLICY "Admins can insert app updates" ON public.app_updates FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update app updates" ON public.app_updates FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete app updates" ON public.app_updates FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- recipes
CREATE POLICY "Recipes are publicly readable" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Admins can insert recipes" ON public.recipes FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update recipes" ON public.recipes FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete recipes" ON public.recipes FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================
-- VIEW
-- ============================================
CREATE VIEW public.public_profiles WITH (security_invoker = on) AS
  SELECT user_id, name, avatar_url, goal, username FROM public.profiles;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bootstrap();

CREATE TRIGGER on_profile_admin_check
  AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_admin_bootstrap();
