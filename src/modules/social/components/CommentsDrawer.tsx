import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useComments } from "../hooks/useComments";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { TrashBin2Bold, PlainBold } from "solar-icon-set";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommentsDrawerProps {
  postId: string | null;
  onClose: () => void;
  onCommentCountChange?: (postId: string, delta: number) => void;
}

export function CommentsDrawer({ postId, onClose, onCommentCountChange }: CommentsDrawerProps) {
  const { user } = useAuth();
  const { comments, loading, fetchComments, addComment, deleteComment } = useComments(postId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (postId) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [postId, fetchComments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSend = async () => {
    if (!text.trim() || sending || !postId) return;
    setSending(true);
    const success = await addComment(text);
    if (success) {
      setText("");
      onCommentCountChange?.(postId, 1);
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment(commentId);
    if (postId) onCommentCountChange?.(postId, -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={!!postId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-base font-black">
            Comentários ({comments.length})
          </DialogTitle>
        </DialogHeader>

        {/* Comments list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 min-h-0 max-h-[55vh]">
          {loading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-3">
              {comments.map(comment => {
                const displayName = comment.author.name || "Usuário";
                const username = comment.author.username || displayName;
                const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR });
                const isOwn = comment.user_id === user?.id;

                return (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                      {comment.author.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-bold text-foreground">@{username}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 break-words">{comment.content}</p>
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 p-1 self-start"
                        title="Excluir comentário"
                      >
                        <TrashBin2Bold size={14} color="currentColor" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={handleKeyDown}
              placeholder="Adicionar comentário..."
              maxLength={500}
              className="flex-1 rounded-full bg-muted/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              size="icon"
              className="rounded-full h-10 w-10 flex-shrink-0"
              disabled={!text.trim() || sending}
              onClick={handleSend}
            >
              <PlainBold size={18} color="currentColor" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
