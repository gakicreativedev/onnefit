
-- Create profile_highlights table
CREATE TABLE public.profile_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  story_ids UUID[] DEFAULT '{}'::uuid[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_highlights ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view any highlights"
  ON public.profile_highlights FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own highlights"
  ON public.profile_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON public.profile_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON public.profile_highlights FOR DELETE
  USING (auth.uid() = user_id);
