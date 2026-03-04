import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useComments } from "../hooks/useComments";
import { useNavigate } from "react-router-dom";
import type { FeedPost } from "../hooks/useFeed";
import {
  HeartBold,
  HeartLinear,
  ChatRoundBold,
  BookmarkBold,
  BookmarkLinear,
  PlainBold,
  VerifiedCheckBold,
  MapPointBold,
  TrashBin2Bold,
  PenBold,
  CloseCircleBold,
  WomenBold,
} from "solar-icon-set";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PostDetailDialogProps {
  post: FeedPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onEdit?: (postId: string, content: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onCommentCountChange?: (postId: string, delta: number) => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return String(n);
}

export function PostDetailDialog({
  post,
  open,
  onOpenChange,
  onLike,
  onBookmark,
  onEdit,
  onDelete,
  onCommentCountChange,
}: PostDetailDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { comments, loading: commentsLoading, fetchComments, addComment, deleteComment } = useComments(post?.id || null);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const isOwnPost = user?.id === post?.user_id;

  useEffect(() => {
    if (open && post) {
      fetchComments();
      setEditing(false);
      setConfirmDelete(false);
      setCommentText("");
    }
  }, [open, post?.id, fetchComments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  if (!post) return null;

  const displayName = post.author.name || "Usuário";
  const username = post.author.username || displayName;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });

  const handleLike = () => {
    setLikeAnim(true);
    onLike(post.id);
    setTimeout(() => setLikeAnim(false), 400);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const success = await addComment(commentText);
    if (success) {
      setCommentText("");
      onCommentCountChange?.(post.id, 1);
    }
    setSendingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    onCommentCountChange?.(post.id, -1);
  };

  const handleStartEdit = () => {
    setEditing(true);
    setEditContent(post.content || "");
  };

  const handleSaveEdit = async () => {
    if (!onEdit) return;
    setSavingEdit(true);
    await onEdit(post.id, editContent);
    setEditing(false);
    setSavingEdit(false);
    toast.success("Post atualizado!");
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    await onDelete(post.id);
    setDeleting(false);
    onOpenChange(false);
    toast.success("Post excluído!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 overflow-hidden rounded-2xl border-border/50 bg-card">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Left: Content / Image */}
          <div className="md:flex-1 md:min-w-0 bg-muted flex items-center justify-center relative">
            {post.image_url ? (
              <div
                className="w-full h-full min-h-[300px] md:min-h-[500px] max-h-[50vh] md:max-h-[90vh] flex items-center justify-center"
                onDoubleClick={() => { if (!post.is_liked) handleLike(); }}
              >
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full h-full object-contain"
                />
                <AnimatePresence>
                  {likeAnim && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 1.2, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <HeartBold size={80} color="hsl(var(--destructive))" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="w-full min-h-[300px] md:min-h-[500px] flex items-center justify-center p-8">
                <p className="text-lg text-foreground leading-relaxed text-center max-w-md">
                  {post.content}
                </p>
              </div>
            )}
          </div>

          {/* Right: Info panel */}
          <div className="md:w-[380px] flex flex-col border-t md:border-t-0 md:border-l border-border bg-card">
            {/* Author header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <button
                onClick={() => { onOpenChange(false); navigate(`/user/${post.user_id}`); }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center ring-2 ring-border">
                  {post.author.avatar_url ? (
                    <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground truncate">{displayName}</span>
                    {post.author.is_verified && <VerifiedCheckBold size={14} color="hsl(var(--primary))" />}
                    {(post as any).women_only && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-500">
                        <WomenBold size={10} color="currentColor" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {post.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPointBold size={10} color="currentColor" /> {post.location}
                      </span>
                    )}
                    <span>{timeAgo}</span>
                  </div>
                </div>
              </button>

              {/* Edit / Delete buttons for own posts */}
              {isOwnPost && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleStartEdit}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Editar"
                  >
                    <PenBold size={15} color="currentColor" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Excluir"
                  >
                    <TrashBin2Bold size={15} color="currentColor" />
                  </button>
                </div>
              )}
            </div>

            {/* Edit overlay */}
            {editing && (
              <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] resize-none bg-background border-border text-sm"
                  placeholder="Editar legenda..."
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}

            {/* Delete confirmation */}
            {confirmDelete && (
              <div className="px-4 py-3 border-b border-border bg-destructive/5 space-y-2">
                <p className="text-sm font-bold text-destructive">Excluir este post?</p>
                <p className="text-xs text-muted-foreground">Essa ação não pode ser desfeita.</p>
                <div className="flex items-center gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Excluindo..." : "Excluir"}
                  </Button>
                </div>
              </div>
            )}

            {/* Caption (only if has image — text-only posts show content in left panel) */}
            {post.content && post.image_url && !editing && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[14px] text-foreground leading-relaxed">
                  <span className="font-bold text-primary mr-1.5">@{username}</span>
                  {post.content}
                </p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs font-bold text-primary">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions row */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={handleLike}
                  whileTap={{ scale: 1.3 }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all text-sm font-bold ${
                    post.is_liked ? "bg-destructive/15 text-destructive" : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  {post.is_liked ? <HeartBold size={18} color="currentColor" /> : <HeartLinear size={18} color="currentColor" />}
                  {post.likes_count > 0 && <span>{formatCount(post.likes_count)}</span>}
                </motion.button>

                <button
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors text-sm font-bold"
                >
                  <ChatRoundBold size={18} color="currentColor" />
                  {post.comments_count > 0 && <span>{post.comments_count}</span>}
                </button>
              </div>

              <motion.button
                onClick={() => onBookmark(post.id)}
                whileTap={{ scale: 1.2 }}
                className={`rounded-full p-1.5 transition-all ${post.is_bookmarked ? "text-primary" : "text-foreground hover:text-primary"}`}
              >
                {post.is_bookmarked ? <BookmarkBold size={20} color="currentColor" /> : <BookmarkLinear size={20} color="currentColor" />}
              </motion.button>
            </div>

            {/* Liked by */}
            {post.recent_likers.length > 0 && (
              <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {post.recent_likers.slice(0, 3).map((name, i) => (
                    <div key={i} className="h-5 w-5 rounded-full bg-muted border-[1.5px] border-card flex items-center justify-center">
                      <span className="text-[8px] font-bold text-primary">{name.charAt(0).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Curtido por <span className="font-semibold text-foreground">{post.recent_likers[0]}</span>
                  {post.likes_count > 1 && <> e <span className="font-semibold text-foreground">outros {post.likes_count - 1}</span></>}
                </p>
              </div>
            )}

            {/* Comments list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 max-h-[300px] md:max-h-none">
              {commentsLoading ? (
                <div className="flex flex-col gap-3 py-2">
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
                <div className="py-6 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum comentário ainda</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {comments.map(comment => {
                    const cName = comment.author.name || "Usuário";
                    const cUsername = comment.author.username || cName;
                    const cTime = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR });
                    const isOwnComment = comment.user_id === user?.id;
                    return (
                      <div key={comment.id} className="flex gap-2.5 group">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                          {comment.author.avatar_url ? (
                            <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-black text-primary">{cName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-foreground">@{cUsername}</span>
                            <span className="text-[10px] text-muted-foreground">{cTime}</span>
                          </div>
                          <p className="text-sm text-foreground mt-0.5 break-words">{comment.content}</p>
                        </div>
                        {isOwnComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 p-1 self-start"
                          >
                            <TrashBin2Bold size={13} color="currentColor" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment input */}
            <div className="px-4 pb-4 pt-2 border-t border-border mt-auto">
              <div className="flex items-center gap-2">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  placeholder="Adicionar comentário..."
                  maxLength={500}
                  className="flex-1 rounded-full bg-muted/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10 flex-shrink-0"
                  disabled={!commentText.trim() || sendingComment}
                  onClick={handleSendComment}
                >
                  <PlainBold size={18} color="currentColor" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
