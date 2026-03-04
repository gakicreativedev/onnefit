-- Prevent non-admin users from changing is_verified
CREATE OR REPLACE FUNCTION public.protect_verified_field()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_verified is being changed, check if the user is admin
  IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    IF (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) != 'admin' THEN
      NEW.is_verified := OLD.is_verified; -- Revert the change
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER protect_verified_on_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_verified_field();
