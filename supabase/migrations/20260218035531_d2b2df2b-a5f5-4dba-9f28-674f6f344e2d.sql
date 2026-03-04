
-- Auto-promote specific email to admin on profile creation
CREATE OR REPLACE FUNCTION public.handle_admin_bootstrap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  
  IF _email = 'gakicreativegroup@gmail.com' THEN
    UPDATE public.user_roles SET role = 'admin' WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_admin_check
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_bootstrap();
