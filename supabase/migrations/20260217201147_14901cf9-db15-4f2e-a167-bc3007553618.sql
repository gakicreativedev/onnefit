
-- Recipes table (admin-created, visible to all)
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  ingredients text[] NOT NULL DEFAULT '{}',
  instructions text,
  calories integer DEFAULT 0,
  protein integer DEFAULT 0,
  carbs integer DEFAULT 0,
  fat integer DEFAULT 0,
  image_url text,
  category text DEFAULT 'general',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipes are publicly readable"
  ON public.recipes FOR SELECT USING (true);

CREATE POLICY "Admins can insert recipes"
  ON public.recipes FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update recipes"
  ON public.recipes FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete recipes"
  ON public.recipes FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- App updates / social posts from admin (app profile)
CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'update',
  likes_count integer DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App updates are publicly readable"
  ON public.app_updates FOR SELECT USING (true);

CREATE POLICY "Admins can insert app updates"
  ON public.app_updates FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update app updates"
  ON public.app_updates FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete app updates"
  ON public.app_updates FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');
