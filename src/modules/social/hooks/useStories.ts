import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface StoryGroup {
  user_id: string;
  name: string;
  avatar_url: string | null;
  stories: { id: string; image_url: string; created_at: string }[];
}

export function useStories() {
  const { user } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map(s => s.user_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const grouped = new Map<string, StoryGroup>();
    data.forEach(story => {
      const existing = grouped.get(story.user_id);
      const profile = profileMap.get(story.user_id);
      if (existing) {
        existing.stories.push({ id: story.id, image_url: story.image_url, created_at: story.created_at });
      } else {
        grouped.set(story.user_id, {
          user_id: story.user_id,
          name: profile?.name || "Usuário",
          avatar_url: profile?.avatar_url || null,
          stories: [{ id: story.id, image_url: story.image_url, created_at: story.created_at }],
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

  return { storyGroups, loading, createStory, hasMyStory: storyGroups.some(g => g.user_id === user?.id) };
}
