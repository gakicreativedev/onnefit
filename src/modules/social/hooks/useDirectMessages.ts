import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface Conversation {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function useDirectMessages(otherUserId?: string) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by conversation partner
    const convMap = new Map<string, { msgs: DirectMessage[] }>();
    data.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(partnerId)) convMap.set(partnerId, { msgs: [] });
      convMap.get(partnerId)!.msgs.push(msg as DirectMessage);
    });

    const partnerIds = [...convMap.keys()];
    if (partnerIds.length === 0) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("user_id, name, username, avatar_url, is_verified")
      .in("user_id", partnerIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    let unread = 0;
    const convList: Conversation[] = partnerIds.map(partnerId => {
      const { msgs } = convMap.get(partnerId)!;
      const profile = profileMap.get(partnerId);
      const unreadCount = msgs.filter(m => m.receiver_id === user.id && !m.read).length;
      unread += unreadCount;
      return {
        user_id: partnerId,
        name: profile?.name || "Usuário",
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        is_verified: profile?.is_verified || false,
        last_message: msgs[0].content,
        last_message_at: msgs[0].created_at,
        unread_count: unreadCount,
      };
    });

    convList.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    setConversations(convList);
    setTotalUnread(unread);
    setLoading(false);
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async () => {
    if (!user || !otherUserId) return;

    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages((data as DirectMessage[]) || []);

    // Mark as read
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .eq("read", false);
  }, [user, otherUserId]);

  const sendMessage = async (content: string) => {
    if (!user || !otherUserId || !content.trim()) return;
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, receiver_id: otherUserId, content: content.trim() })
      .select()
      .single();

    if (!error && data) {
      setMessages(prev => [...prev, data as DirectMessage]);
    }
    return { error };
  };

  useEffect(() => {
    if (otherUserId) fetchMessages();
    else fetchConversations();
  }, [fetchConversations, fetchMessages, otherUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dm-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      }, (payload) => {
        const msg = payload.new as DirectMessage;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          if (otherUserId && (msg.sender_id === otherUserId || msg.receiver_id === otherUserId)) {
            setMessages(prev => [...prev, msg]);
            // Auto-mark as read
            if (msg.sender_id === otherUserId) {
              supabase.from("direct_messages").update({ read: true }).eq("id", msg.id);
            }
          } else {
            fetchConversations();
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, otherUserId, fetchConversations]);

  return { conversations, messages, loading, totalUnread, sendMessage, refetch: otherUserId ? fetchMessages : fetchConversations };
}
