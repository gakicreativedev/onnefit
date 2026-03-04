import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function useTrainerChat(user: User | null, studentId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("trainer_messages")
      .select("id, sender_id, content, created_at")
      .or(`trainer_id.eq.${user.id},student_id.eq.${user.id}`)
      .or(`trainer_id.eq.${studentId},student_id.eq.${studentId}`)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => {
    fetchMessages();

    if (!user || !studentId) return;

    const channel = supabase
      .channel(`chat-${studentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trainer_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, user, studentId]);

  const sendMessage = async (content: string) => {
    if (!user || !studentId || !content.trim()) return;
    await supabase.from("trainer_messages").insert({
      trainer_id: user.id,
      student_id: studentId,
      sender_id: user.id,
      content: content.trim(),
    });
  };

  return { messages, loading, sendMessage };
}
