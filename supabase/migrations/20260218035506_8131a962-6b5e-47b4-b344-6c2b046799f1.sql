
-- ============================================
-- 1. DROP ALL EXISTING TRIGGER FUNCTIONS & TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_streak ON auth.users;
DROP TRIGGER IF EXISTS on_first_admin_assignment ON public.profiles;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_streak() CASCADE;

-- ============================================
-- 2. SINGLE OPTIMIZED FUNCTION FOR USER BOOTSTRAP
-- Handles profile, role and streak in ONE transaction
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_bootstrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'athlete')
  ON CONFLICT DO NOTHING;

  -- Initialize streak
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================
-- 3. SINGLE TRIGGER (AFTER INSERT)
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_bootstrap();

-- ============================================
-- 4. ADD UNIQUE CONSTRAINT ON user_streaks.user_id
--    (needed for ON CONFLICT to work)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_streaks_user_id_key'
  ) THEN
    ALTER TABLE public.user_streaks ADD CONSTRAINT user_streaks_user_id_key UNIQUE (user_id);
  END IF;
END;
$$;

-- ============================================
-- 5. ADD UNIQUE CONSTRAINT ON user_roles (user_id, role)
--    (needed for ON CONFLICT to work)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END;
$$;
