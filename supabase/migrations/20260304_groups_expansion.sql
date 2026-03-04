-- =============================================================
-- Onne Fit — Groups Module Expansion
-- Adds: challenges, custom scoring, activity feed, reactions, comments
-- =============================================================

-- 1. Expand `groups` table with challenge & scoring fields
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_type TEXT DEFAULT 'club';
ALTER TABLE groups ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS start_of_week INT DEFAULT 1;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS score_rules JSONB DEFAULT '{"type":"per_workout","value":1}';

-- 2. Group Activities (the feed)
CREATE TABLE IF NOT EXISTS group_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  description TEXT,
  distance_km DOUBLE PRECISION,
  duration_min INT,
  calories INT,
  steps INT,
  custom_rule_label TEXT,
  points_awarded DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_activities_group ON group_activities(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_activities_user  ON group_activities(user_id);

-- 3. Activity Reactions (emoji)
CREATE TABLE IF NOT EXISTS activity_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES group_activities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, user_id, emoji)
);

-- 4. Activity Comments
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES group_activities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id, created_at);

-- 5. RLS Policies
ALTER TABLE group_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- group_activities: members can read, own user can write
CREATE POLICY "Members can view group activities" ON group_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_activities.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can insert activities" ON group_activities
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_activities.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own activities" ON group_activities
  FOR DELETE USING (auth.uid() = user_id);

-- activity_reactions: members can read/write
CREATE POLICY "Members can view reactions" ON activity_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_activities ga
      JOIN group_members gm ON gm.group_id = ga.group_id AND gm.user_id = auth.uid()
      WHERE ga.id = activity_reactions.activity_id
    )
  );

CREATE POLICY "Members can react" ON activity_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions" ON activity_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- activity_comments: members can read/write
CREATE POLICY "Members can view comments" ON activity_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_activities ga
      JOIN group_members gm ON gm.group_id = ga.group_id AND gm.user_id = auth.uid()
      WHERE ga.id = activity_comments.activity_id
    )
  );

CREATE POLICY "Members can comment" ON activity_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON activity_comments
  FOR DELETE USING (auth.uid() = user_id);
