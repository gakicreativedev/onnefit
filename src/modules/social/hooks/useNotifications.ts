import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  post_id: string;
  content: string | null;
  read: boolean;
  created_at: string;
  actor: {
    name: string | null;
    avatar_url: string | null;
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }

    const actorIds = [...new Set(data.map(n => n.actor_id))];
    const { data: profiles } = actorIds.length > 0
      ? await supabase.from("public_profiles").select("user_id, name, avatar_url").in("user_id", actorIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const enriched: Notification[] = data.map(n => {
      const profile = profileMap.get(n.actor_id);
      return {
        ...n,
        actor: {
          name: profile?.name || "Usuário",
          avatar_url: profile?.avatar_url || null,
        },
      };
    });

    setNotifications(enriched);
    setUnreadCount(enriched.filter(n => !n.read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, loading, fetchNotifications, markAllRead, markOneRead };
}

// Helper to send a notification (called from like/comment actions)
export async function sendNotification(actorId: string, targetUserId: string, type: "like" | "comment" | "follow_request" | "follow_accepted" | "story_reaction" | "story_reply" | "group_invite" | "challenge_winner" | "group_activity", postId: string | null, content?: string) {
  // Don't notify yourself
  if (actorId === targetUserId) return;

  await supabase.from("notifications").insert({
    user_id: targetUserId,
    actor_id: actorId,
    type,
    post_id: postId,
    content: content || null,
  });
}
