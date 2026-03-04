import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface Highlight {
  id: string;
  user_id: string;
  label: string;
  icon: string;
  sort_order: number;
  story_ids: string[];
  created_at: string;
}

export function useHighlights(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHighlights = useCallback(async () => {
    if (!targetUserId) return;
    const { data } = await supabase
      .from("profile_highlights")
      .select("*")
      .eq("user_id", targetUserId)
      .order("sort_order", { ascending: true });
    setHighlights((data || []) as Highlight[]);
    setLoading(false);
  }, [targetUserId]);

  useEffect(() => { fetchHighlights(); }, [fetchHighlights]);

  const createHighlight = async (label: string, icon: string) => {
    if (!user) return;
    const nextOrder = highlights.length;
    await supabase.from("profile_highlights").insert({
      user_id: user.id,
      label,
      icon,
      sort_order: nextOrder,
    });
    await fetchHighlights();
  };

  const updateHighlight = async (id: string, label: string, icon: string) => {
    await supabase.from("profile_highlights").update({ label, icon }).eq("id", id);
    await fetchHighlights();
  };

  const deleteHighlight = async (id: string) => {
    await supabase.from("profile_highlights").delete().eq("id", id);
    await fetchHighlights();
  };

  const addStoryToHighlight = async (highlightId: string, storyId: string) => {
    const h = highlights.find(h => h.id === highlightId);
    if (!h) return;
    const newIds = [...(h.story_ids || []), storyId];
    await supabase.from("profile_highlights").update({ story_ids: newIds }).eq("id", highlightId);
    await fetchHighlights();
  };

  const removeStoryFromHighlight = async (highlightId: string, storyId: string) => {
    const h = highlights.find(h => h.id === highlightId);
    if (!h) return;
    const newIds = (h.story_ids || []).filter(id => id !== storyId);
    await supabase.from("profile_highlights").update({ story_ids: newIds }).eq("id", highlightId);
    await fetchHighlights();
  };

  return {
    highlights,
    loading,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    addStoryToHighlight,
    removeStoryFromHighlight,
    refetch: fetchHighlights,
  };
}
