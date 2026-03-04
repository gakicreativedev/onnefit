
-- Recreate triggers for automatic profile/role/streak creation on signup
-- These triggers fire the existing SECURITY DEFINER functions

-- Trigger: auto-create profile on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-create user role on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Trigger: auto-create user streak on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_streak
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_streak();
