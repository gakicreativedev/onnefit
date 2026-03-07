import { useState, useRef, useEffect } from "react";
import { useGroupChat } from "../hooks/useGroupChat";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { PlainBold, ChatSquare2Bold } from "solar-icon-set";

interface GroupChatTabProps {
    groupId: string;
}

export default function GroupChatTab({ groupId }: GroupChatTabProps) {
    const { messages, loading, sendMessage } = useGroupChat(groupId);
    const { user } = useAuth();
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        await sendMessage(text);
        setText("");
        setSending(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-3 py-6 px-1">
                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] bg-card rounded-2xl border border-border/50 overflow-hidden relative">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <ChatSquare2Bold size={48} className="mb-4 opacity-20" color="currentColor" />
                    <p className="font-bold text-foreground mb-1 text-base">Chat da Equipe</p>
                    <p className="text-sm">Mande a primeira mensagem e inicie a conversa!</p>
                </div>
            ) : (
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {messages.map(msg => {
                        const isMine = msg.user_id === user?.id;
                        return (
                            <motion.div
                                key={msg.id}
                                className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {!isMine && (
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center mt-1">
                                        {msg.profiles?.avatar_url ? (
                                            <img src={msg.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-primary">{(msg.profiles?.name || "U").charAt(0)}</span>
                                        )}
                                    </div>
                                )}

                                <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                                    {!isMine && <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">{msg.profiles?.name}</span>}
                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${isMine
                                            ? "bg-primary text-primary-foreground rounded-br-md"
                                            : "bg-muted/80 text-foreground rounded-bl-md"
                                        }`}>
                                        {msg.content}
                                        <div className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"} flex ${isMine ? "justify-end" : "justify-start"}`}>
                                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Input Bottom */}
            <div className="p-3 border-t border-border/50 bg-card/95 backdrop-blur flex gap-2 items-center">
                <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()}
                    placeholder="Mensagem para o grupo..."
                    className="flex-1 rounded-full bg-background border-border/50"
                />
                <motion.button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    whileTap={{ scale: 0.9 }}
                    className="h-10 w-10 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground transition-opacity disabled:opacity-50"
                >
                    <PlainBold size={18} color="currentColor" />
                </motion.button>
            </div>
        </div>
    );
}
