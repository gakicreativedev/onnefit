
-- Add cost_level to recipes (1=barato, 2=médio, 3=caro)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cost_level integer DEFAULT 1;

-- Recipe comments
CREATE TABLE public.recipe_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipe comments" ON public.recipe_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.recipe_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.recipe_comments FOR DELETE USING (auth.uid() = user_id);

-- Recipe ratings (1-5 stars, one per user per recipe)
CREATE TABLE public.recipe_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings" ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY "Users can rate recipes" ON public.recipe_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating" ON public.recipe_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rating" ON public.recipe_ratings FOR DELETE USING (auth.uid() = user_id);

-- Make all recipes viewable by authenticated users (update existing policy)
DROP POLICY IF EXISTS "Users can view own or shared recipes" ON public.recipes;
CREATE POLICY "Authenticated users can view recipes" ON public.recipes FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow any authenticated user to create recipes
DROP POLICY IF EXISTS "Users can insert own recipes" ON public.recipes;
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = created_by);
