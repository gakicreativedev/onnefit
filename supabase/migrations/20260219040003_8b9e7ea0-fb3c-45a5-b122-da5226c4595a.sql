
-- Tabela TACO - Tabela Brasileira de Composição de Alimentos (UNICAMP)
CREATE TABLE public.taco_foods (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  calories_kcal numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  serving_size text NOT NULL DEFAULT '100g'
);

-- Index for text search
CREATE INDEX idx_taco_foods_name ON public.taco_foods USING gin (to_tsvector('portuguese', name));
CREATE INDEX idx_taco_foods_category ON public.taco_foods (category);

-- RLS: readable by authenticated users
ALTER TABLE public.taco_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view taco foods"
  ON public.taco_foods FOR SELECT
  USING (auth.uid() IS NOT NULL);
