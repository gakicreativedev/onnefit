
-- Recipe bookmarks/favorites
CREATE TABLE public.recipe_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);
ALTER TABLE public.recipe_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON public.recipe_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark recipes" ON public.recipe_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON public.recipe_bookmarks FOR DELETE USING (auth.uid() = user_id);
