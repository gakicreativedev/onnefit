
-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public) VALUES ('recipes', 'recipes', true);

-- Storage policies
CREATE POLICY "Recipe images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'recipes');
CREATE POLICY "Authenticated users can upload recipe images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipes' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own recipe images" ON storage.objects FOR DELETE USING (bucket_id = 'recipes' AND auth.uid()::text = (storage.foldername(name))[1]);
