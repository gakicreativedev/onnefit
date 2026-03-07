import { useState, useRef, useEffect } from "react";
import { useDirectMessages, type Conversation } from "../hooks/useDirectMessages";
import { ArrowLeftBold, PlainBold, ChatSquare2Bold, TrashBinTrashBold } from "solar-icon-set";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export default function InboxPage() {
    const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
    const [activePartnerName, setActivePartnerName] = useState<string>("");
    const { conversations, messages, loading, sendMessage, refetch } = useDirectMessages(activePartnerId || undefined);
    const [replyText, setReplyText] = useState("");
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activePartnerId) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, activePartnerId]);

    const handleSend = async () => {
        if (!replyText.trim() || !activePartnerId || sending) return;
        setSending(true);
        await sendMessage(replyText.trim());
        setReplyText("");
        setSending(false);
    };

    const handleSelectPartner = (id: string, name: string) => {
        setActivePartnerId(id);
        setActivePartnerName(name);
    };

    const activeConvo = activePartnerId ? conversations.find(c => c.user_id === activePartnerId) : null;
    const avatarToUse = activeConvo?.avatar_url || null;

    return (
        <div className="flex flex-col h-[100dvh] bg-background max-w-2xl mx-auto border-x border-border/50">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/90 backdrop-blur-xl sticky top-0 z-20">
                <button onClick={() => activePartnerId ? setActivePartnerId(null) : navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/60 transition-colors">
                    <ArrowLeftBold size={24} color="currentColor" />
                </button>
                {activePartnerId ? (
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                            {avatarToUse ? (
                                <img src={avatarToUse} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-primary">
                                    {(activePartnerName || "U").charAt(0)}
                                </span>
                            )}
                        </div>
                        <h1 className="font-bold text-lg">{activePartnerName}</h1>
                    </div>
                ) : (
                    <h1 className="font-black text-xl flex items-center gap-2"><ChatSquare2Bold size={24} className="text-primary" /> Mensagens</h1>
                )}
            </div>

            {loading && !activePartnerId ? (
                <div className="flex-1 flex flex-col gap-3 p-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
                </div>
            ) : activePartnerId ? (
                /* Chat View */
                <div className="flex-1 flex flex-col min-h-0 relative">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => {
                            const isMine = msg.sender_id === user?.id;
                            return (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground border border-border/50 rounded-bl-none"}`}>
                                        <p>{msg.content}</p>
                                        <div className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"} flex justify-end gap-1`}>
                                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                            {isMine && msg.read && <span className="text-[10px] ml-1 font-medium">· Lido</span>}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <Input
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                                placeholder="Digite sua mensagem..."
                                className="flex-1 rounded-full bg-card border-border/50 focus-visible:ring-1"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!replyText.trim() || sending}
                                className="h-10 w-10 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm disabled:opacity-50 transition-opacity"
                            >
                                <PlainBold size={18} color="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* List View */
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                            <ChatSquare2Bold size={48} className="mb-4 opacity-20" color="currentColor" />
                            <p className="font-medium text-foreground mb-1">Caixa de entrada vazia</p>
                            <p className="text-sm">Suas respostas de stories e mensagens aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {conversations.map((convo) => (
                                <button
                                    key={convo.user_id}
                                    onClick={() => handleSelectPartner(convo.user_id, convo.name)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors text-left"
                                >
                                    <div className="relative">
                                        <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {convo.avatar_url ? (
                                                <img src={convo.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-bold text-primary">{(convo.name || "U").charAt(0)}</span>
                                            )}
                                        </div>
                                        {convo.unread_count > 0 && (
                                            <div className="absolute top-0 right-0 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center border-2 border-background">
                                                {convo.unread_count}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`font-bold truncate ${convo.unread_count > 0 ? "text-foreground" : "text-foreground/80"}`}>
                                                {convo.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                {formatDistanceToNow(new Date(convo.last_message_at), { locale: ptBR })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <p className={`text-sm truncate ${convo.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                                {convo.last_message}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
