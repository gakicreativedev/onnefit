
-- Role enum
CREATE TYPE public.app_role AS ENUM ('athlete', 'professional');

-- User roles table (security best practice: separate from profiles)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'athlete',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Everyone starts as athlete on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'athlete');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Security definer function to check role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS: users can read their own role
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: users can update own role (to switch to professional)
CREATE POLICY "Users can update own role"
  ON public.user_roles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trainer-student relationship
CREATE TABLE public.trainer_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, active, inactive
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);

ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

-- Trainers can see their students
CREATE POLICY "Trainers can view own students"
  ON public.trainer_students FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = student_id);

CREATE POLICY "Trainers can insert students"
  ON public.trainer_students FOR INSERT
  WITH CHECK (auth.uid() = trainer_id AND public.get_user_role(auth.uid()) = 'professional');

CREATE POLICY "Trainers can update own students"
  ON public.trainer_students FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own students"
  ON public.trainer_students FOR DELETE
  USING (auth.uid() = trainer_id);

-- Trainer messages (chat)
CREATE TABLE public.trainer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.trainer_messages FOR SELECT
  USING (auth.uid() = trainer_id OR auth.uid() = student_id);

CREATE POLICY "Participants can send messages"
  ON public.trainer_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND (auth.uid() = trainer_id OR auth.uid() = student_id));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_messages;
