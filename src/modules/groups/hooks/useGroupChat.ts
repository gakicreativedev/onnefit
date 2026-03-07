import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface GroupMessage {
    id: string;
    group_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: {
        name: string;
        avatar_url: string | null;
    }
}

export function useGroupChat(groupId?: string) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = useCallback(async () => {
        if (!groupId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("group_messages")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
            const userIds = [...new Set(data.map((m: any) => m.user_id))];
            const { data: profilesData } = await supabase
                .from("public_profiles")
                .select("user_id, name, avatar_url")
                .in("user_id", userIds);

            const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));

            const formatted = data.map((msg: any) => ({
                ...msg,
                profiles: profileMap.get(msg.user_id) || { name: "Usuário", avatar_url: null }
            }));

            setMessages(formatted as GroupMessage[]);
        } else {
            setMessages([]);
        }
        setLoading(false);
    }, [groupId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    useEffect(() => {
        if (!groupId) return;

        const channel = supabase.channel(`group_chat_${groupId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "group_messages",
                    filter: `group_id=eq.${groupId}`
                },
                async (payload) => {
                    const newMsg = payload.new as GroupMessage;
                    const { data } = await supabase.from("public_profiles").select("name, avatar_url").eq("user_id", newMsg.user_id).single();
                    newMsg.profiles = data || { name: "Usuário", avatar_url: null };
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId]);

    const sendMessage = async (content: string) => {
        if (!user || !groupId || !content.trim()) return;

        const { error } = await supabase.from("group_messages").insert({
            group_id: groupId,
            user_id: user.id,
            content: content.trim()
        });

        return { error };
    };

    return { messages, loading, sendMessage };
}
