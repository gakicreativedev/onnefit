import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useDirectMessages, type Conversation } from "../hooks/useDirectMessages";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PlainBold, ArrowLeftLinear, VerifiedCheckBold } from "solar-icon-set";
import { useNavigate } from "react-router-dom";

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUserId?: string | null;
  initialUserName?: string | null;
}

export function ChatDrawer({ open, onOpenChange, initialUserId, initialUserName }: ChatDrawerProps) {
  const [activeChat, setActiveChat] = useState<{ userId: string; name: string } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (initialUserId && initialUserName && open) {
      setActiveChat({ userId: initialUserId, name: initialUserName });
    }
  }, [initialUserId, initialUserName, open]);

  const handleClose = () => {
    setActiveChat(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {activeChat ? (
          <ChatView
            otherUserId={activeChat.userId}
            otherUserName={activeChat.name}
            onBack={() => setActiveChat(null)}
            currentUserId={user?.id}
          />
        ) : (
          <ConversationList
            onSelectChat={(userId, name) => setActiveChat({ userId, name })}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ConversationList({ onSelectChat }: { onSelectChat: (userId: string, name: string) => void }) {
  const { conversations, loading } = useDirectMessages();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
        <SheetTitle className="text-lg font-black flex items-center gap-2">
          <PlainBold size={20} color="hsl(var(--primary))" />
          Mensagens
        </SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <PlainBold size={32} color="hsl(var(--primary))" />
            </div>
            <p className="text-sm font-bold text-foreground">Sem mensagens ainda</p>
            <p className="text-xs text-muted-foreground">Siga pessoas e espere que elas sigam você de volta para trocar mensagens!</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {conversations.map(conv => (
              <button
                key={conv.user_id}
                onClick={() => onSelectChat(conv.user_id, conv.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                  {conv.avatar_url ? (
                    <img src={conv.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-primary">{(conv.name || "U").charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground truncate">{conv.name}</span>
                    {conv.is_verified && <VerifiedCheckBold size={12} color="hsl(var(--primary))" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: ptBR })}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatView({ otherUserId, otherUserName, onBack, currentUserId }: {
  otherUserId: string;
  otherUserName: string;
  onBack: () => void;
  currentUserId?: string;
}) {
  const { messages, sendMessage } = useDirectMessages(otherUserId);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button onClick={onBack} className="p-1 rounded-full hover:bg-muted/50 transition-colors">
          <ArrowLeftLinear size={22} color="hsl(var(--foreground))" />
        </button>
        <span className="text-sm font-bold text-foreground">{otherUserName}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <motion.div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                isMine
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}>
                {msg.content}
                <div className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Mensagem..."
          className="flex-1 rounded-full"
        />
        <motion.button
          onClick={handleSend}
          whileTap={{ scale: 0.9 }}
          disabled={!text.trim() || sending}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50"
        >
          <PlainBold size={18} color="currentColor" />
        </motion.button>
      </div>
    </div>
  );
}
