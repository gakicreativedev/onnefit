-- Missing table for Story Reactions

CREATE TABLE IF NOT EXISTS story_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story reactions" ON story_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reactions" ON story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON story_reactions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own reactions" ON story_reactions FOR UPDATE USING (auth.uid() = user_id);
