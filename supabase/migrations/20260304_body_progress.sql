-- =============================================
-- SQL de Referência — Progresso Corporal
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Tabela de medidas corporais
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  chest_cm NUMERIC(5,1),
  arm_left_cm NUMERIC(5,1),
  arm_right_cm NUMERIC(5,1),
  thigh_left_cm NUMERIC(5,1),
  thigh_right_cm NUMERIC(5,1),
  neck_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- 2. Tabela de fotos de progresso
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('front', 'side', 'back')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. RLS Policies
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Users can only CRUD their own measurements
CREATE POLICY "Users can view own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only CRUD their own photos
CREATE POLICY "Users can view own photos"
  ON progress_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON progress_photos FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Storage Bucket para fotos de progresso
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own progress photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view progress photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'progress-photos');

CREATE POLICY "Users can delete own progress photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Indices para performance
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
  ON body_measurements(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON progress_photos(user_id, date DESC);
