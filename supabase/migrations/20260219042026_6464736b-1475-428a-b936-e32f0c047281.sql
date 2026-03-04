
ALTER TABLE public.taco_foods
  ADD COLUMN iron_mg numeric NOT NULL DEFAULT 0,
  ADD COLUMN calcium_mg numeric NOT NULL DEFAULT 0,
  ADD COLUMN vitamin_c_mg numeric NOT NULL DEFAULT 0,
  ADD COLUMN potassium_mg numeric NOT NULL DEFAULT 0;
