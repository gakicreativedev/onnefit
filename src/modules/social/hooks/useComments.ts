import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { sendNotification } from "./useNotifications";

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export function useComments(postId: string | null) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);

    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("public_profiles").select("user_id, name, username, avatar_url").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched: Comment[] = data.map(c => {
      const profile = profileMap.get(c.user_id);
      return {
        ...c,
        author: {
          name: profile?.name || "Usuário",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        },
      };
    });

    setComments(enriched);
    setLoading(false);
  }, [postId]);

  const addComment = async (content: string) => {
    if (!user || !postId || !content.trim()) return;

    const trimmed = content.trim().slice(0, 500);

    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: user.id, content: trimmed })
      .select()
      .single();

    if (!error && data) {
      // Fetch user profile for the new comment
      const { data: profile } = await supabase
        .from("public_profiles")
        .select("user_id, name, username, avatar_url")
        .eq("user_id", user.id)
        .single();

      const newComment: Comment = {
        ...data,
        author: {
          name: profile?.name || "Usuário",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
        },
      };
      setComments(prev => [...prev, newComment]);

      // Notify post owner
      const { data: post } = await supabase.from("posts").select("user_id").eq("id", postId).single();
      if (post) {
        sendNotification(user.id, post.user_id, "comment", postId, trimmed);
      }
    }

    return !error;
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("post_comments").delete().eq("id", commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return { comments, loading, fetchComments, addComment, deleteComment };
}
