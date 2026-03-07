import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface Story {
  id: string;
  image_url: string;
  created_at: string;
  views?: { user_id: string; name: string; avatar_url: string | null }[];
  reactions?: { user_id: string; name: string; avatar_url: string | null; emoji: string }[];
}

export interface StoryGroup {
  user_id: string;
  name: string;
  avatar_url: string | null;
  stories: Story[];
}

export function useStories() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    // @ts-ignore
    const { data } = await (supabase as any)
      .from("stories")
      .select("*, story_views(user_id), story_reactions(user_id, emoji)")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Get all unique users involved (authors, viewers, reactors)
    const userIdsSet = new Set<string>();
    data.forEach(s => {
      userIdsSet.add(s.user_id);
      s.story_views?.forEach((v: any) => userIdsSet.add(v.user_id));
      s.story_reactions?.forEach((r: any) => userIdsSet.add(r.user_id));
    });
    const userIds = Array.from(userIdsSet);
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const grouped = new Map<string, StoryGroup>();
    data.forEach(story => {
      const existing = grouped.get(story.user_id);
      const profile = profileMap.get(story.user_id);

      const parsedStory: Story = {
        id: story.id,
        image_url: story.image_url,
        created_at: story.created_at,
        views: story.story_views?.map((v: any) => {
          const p = profileMap.get(v.user_id);
          return { user_id: v.user_id, name: p?.name || "Usuário", avatar_url: p?.avatar_url || null };
        }) || [],
        reactions: story.story_reactions?.map((r: any) => {
          const p = profileMap.get(r.user_id);
          return { user_id: r.user_id, name: p?.name || "Usuário", avatar_url: p?.avatar_url || null, emoji: r.emoji };
        }) || [],
      };

      if (existing) {
        existing.stories.push(parsedStory);
      } else {
        grouped.set(story.user_id, {
          user_id: story.user_id,
          name: profile?.name || "Usuário",
          avatar_url: profile?.avatar_url || null,
          stories: [parsedStory],
        });
      }
    });

    // Put current user first
    const groups = Array.from(grouped.values());
    if (user) {
      const idx = groups.findIndex(g => g.user_id === user.id);
      if (idx > 0) {
        const [mine] = groups.splice(idx, 1);
        groups.unshift(mine);
      }
    }

    setStoryGroups(groups);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const logView = useCallback(async (storyId: string, authorId: string) => {
    if (!user || user.id === authorId) return;
    // @ts-ignore
    await (supabase as any).from("story_views").upsert(
      { story_id: storyId, user_id: user.id },
      { onConflict: "story_id,user_id", ignoreDuplicates: true }
    );
  }, [user]);

  const createStory = async (imageFile: File, womenOnly = false) => {
    if (!user) return;
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/story_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("social").upload(path, imageFile);
    if (error) return;
    const { data } = supabase.storage.from("social").getPublicUrl(path);
    await supabase.from("stories").insert({ user_id: user.id, image_url: data.publicUrl, women_only: womenOnly });
    await fetchStories();
  };

  return { storyGroups, loading, createStory, logView, hasMyStory: storyGroups.some(g => g.user_id === user?.id) };
}
