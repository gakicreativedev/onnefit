
-- Groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by UUID NOT NULL,
  max_members INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Group rankings
CREATE TABLE public.group_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  days_trained INTEGER NOT NULL DEFAULT 0,
  days_diet_logged INTEGER NOT NULL DEFAULT 0,
  streak_best INTEGER NOT NULL DEFAULT 0,
  water_goal_days INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id, period_type, period_start)
);

-- Group invites
CREATE TABLE public.group_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, invited_user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Anyone can view public groups or own groups" ON public.groups FOR SELECT
USING (is_public = true OR created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()
));

CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group" ON public.groups FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete group" ON public.groups FOR DELETE
USING (auth.uid() = created_by);

-- Group members policies
CREATE POLICY "Members and public group viewers can see members" ON public.group_members FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.is_public = true)
);

CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave or creator can remove" ON public.group_members FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.created_by = auth.uid()
));

-- Group rankings policies
CREATE POLICY "Members can view rankings" ON public.group_rankings FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_rankings.group_id AND gm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_rankings.group_id AND g.is_public = true)
);

-- Group invites policies
CREATE POLICY "Users can view own invites" ON public.group_invites FOR SELECT
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

CREATE POLICY "Members can invite" ON public.group_invites FOR INSERT
WITH CHECK (auth.uid() = invited_by AND EXISTS (
  SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_invites.group_id AND gm.user_id = auth.uid()
));

CREATE POLICY "Invited user can update invite" ON public.group_invites FOR UPDATE
USING (auth.uid() = invited_user_id);

CREATE POLICY "Users can delete own invites" ON public.group_invites FOR DELETE
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
