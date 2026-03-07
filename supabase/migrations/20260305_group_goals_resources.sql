-- Migration for Group Goals and Resources

-- 1. Group Goals Table
CREATE TABLE IF NOT EXISTS group_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    metric_type TEXT NOT NULL, -- e.g., 'distance_km', 'duration_min', 'calories', 'steps', 'custom'
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group goals" 
    ON group_goals FOR SELECT USING (true);

CREATE POLICY "Admins can insert group goals" 
    ON group_goals FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_goals.group_id AND role = 'admin'));

CREATE POLICY "Admins can update group goals" 
    ON group_goals FOR UPDATE 
    USING (auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_goals.group_id AND role = 'admin'));

CREATE POLICY "Admins can delete group goals" 
    ON group_goals FOR DELETE 
    USING (auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_goals.group_id AND role = 'admin'));


-- 2. Group Resources (Mural/Links) Table
CREATE TABLE IF NOT EXISTS group_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE group_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view group resources" 
    ON group_resources FOR SELECT USING (true);

CREATE POLICY "Admins can insert group resources" 
    ON group_resources FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_resources.group_id AND role = 'admin'));

CREATE POLICY "Admins can delete group resources" 
    ON group_resources FOR DELETE 
    USING (auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_resources.group_id AND role = 'admin'));
