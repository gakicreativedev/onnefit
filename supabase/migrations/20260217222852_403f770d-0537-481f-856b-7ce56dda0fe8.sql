
-- Auto-create user_streaks for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_streak_created ON auth.users;
CREATE TRIGGER on_auth_user_streak_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_streak();

-- Create streak records for existing users who don't have one
INSERT INTO public.user_streaks (user_id, current_streak, longest_streak)
SELECT u.id, 0, 0
FROM auth.users u
LEFT JOIN public.user_streaks s ON s.user_id = u.id
WHERE s.id IS NULL;
