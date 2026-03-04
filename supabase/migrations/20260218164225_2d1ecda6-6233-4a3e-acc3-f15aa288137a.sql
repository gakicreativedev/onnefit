ALTER TABLE public.workouts ADD COLUMN day_of_week integer DEFAULT NULL;
COMMENT ON COLUMN public.workouts.day_of_week IS '0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado';