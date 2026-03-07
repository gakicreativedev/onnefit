import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartBold,
  HeartLinear,
  ChatRoundBold,
  PlainBold,
  BookmarkBold,
  BookmarkLinear,
  VerifiedCheckBold,
  MapPointBold,
  WomenBold,
  UsersGroupTwoRoundedBold,
} from "solar-icon-set";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "../hooks/useFeed";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedPostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onComment: (postId: string) => void;
  onFollow?: (userId: string) => void;
  onTagClick?: (tag: string) => void;
  onOpenDetail?: (post: FeedPost) => void;
  isFollowing?: boolean;
  isOwnPost?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return String(n);
}

export function FeedPostCard({ post, onLike, onBookmark, onComment, onFollow, onTagClick, onOpenDetail, isFollowing, isOwnPost }: FeedPostCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const navigate = useNavigate();
  const displayName = post.author.name || "Usuário";
  const username = post.author.username || displayName;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });

  const handleLike = () => {
    setLikeAnim(true);
    onLike(post.id);
    setTimeout(() => setLikeAnim(false), 400);
  };

  const handleDoubleTapLike = () => {
    if (!post.is_liked) handleLike();
  };

  return (
    <motion.article
      className="rounded-2xl bg-card overflow-hidden border border-border/50"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <button
          onClick={() => navigate(`/user/${post.user_id}`)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center ring-2 ring-border">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">{displayName}</span>
              {post.author.is_verified && (
                <VerifiedCheckBold size={14} color="hsl(var(--primary))" />
              )}
              {(post as any).women_only && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-500">
                  <WomenBold size={10} color="currentColor" /> Feminino
                </span>
              )}
              {post.group && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary max-w-[100px] truncate" title={post.group.name}>
                  <UsersGroupTwoRoundedBold size={10} color="currentColor" /> {post.group.name}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">· {timeAgo}</span>
            </div>
            {post.location && (
              <span className="text-[11px] text-muted-foreground leading-tight flex items-center gap-0.5">
                <MapPointBold size={10} color="currentColor" /> {post.location}
              </span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2">
          {!isOwnPost && onFollow && (
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              className="rounded-full px-3.5 text-xs font-bold h-7"
              onClick={() => onFollow(post.user_id)}
            >
              {isFollowing ? "Seguindo" : "Seguir"}
            </Button>
          )}
          <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Text-only content */}
      {post.content && !post.image_url && (
        <div className="px-4 pb-3 cursor-pointer" onClick={() => onOpenDetail?.(post)}>
          <p className="text-[15px] text-foreground leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div
          className="relative w-full aspect-[4/5] overflow-hidden bg-muted cursor-pointer"
          onDoubleClick={handleDoubleTapLike}
          onClick={() => onOpenDetail?.(post)}
        >
          {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
          <img
            src={post.image_url}
            alt="Post"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
          />
          {likeAnim && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <HeartBold size={80} color="hsl(var(--destructive))" />
            </motion.div>
          )}
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-4 pt-2.5 flex flex-wrap gap-1.5">
          {post.tags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Actions row */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <motion.button
            onClick={handleLike}
            whileTap={{ scale: 1.3 }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all text-sm font-bold ${post.is_liked
                ? "bg-destructive/15 text-destructive"
                : "text-foreground hover:bg-muted/60"
              }`}
          >
            {post.is_liked ? (
              <HeartBold size={18} color="currentColor" />
            ) : (
              <HeartLinear size={18} color="currentColor" />
            )}
            {post.likes_count > 0 && <span>{formatCount(post.likes_count)}</span>}
          </motion.button>

          <button
            onClick={() => onComment(post.id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-foreground hover:bg-muted/60 transition-colors text-sm font-bold"
          >
            <ChatRoundBold size={18} color="currentColor" />
            {post.comments_count > 0 && <span>{post.comments_count}</span>}
          </button>

          <button className="rounded-full p-1.5 text-foreground hover:bg-muted/60 transition-colors">
            <PlainBold size={18} color="currentColor" />
          </button>
        </div>

        <motion.button
          onClick={() => onBookmark(post.id)}
          whileTap={{ scale: 1.2 }}
          className={`rounded-full p-1.5 transition-all ${post.is_bookmarked ? "text-primary" : "text-foreground hover:text-primary"}`}
        >
          {post.is_bookmarked ? (
            <BookmarkBold size={20} color="currentColor" />
          ) : (
            <BookmarkLinear size={20} color="currentColor" />
          )}
        </motion.button>
      </div>

      {/* Liked by */}
      {post.recent_likers.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {post.recent_likers.slice(0, 3).map((name, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-full bg-muted border-[1.5px] border-card flex items-center justify-center"
              >
                <span className="text-[8px] font-bold text-primary">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Curtido por <span className="font-semibold text-foreground">{post.recent_likers[0]}</span>
            {post.likes_count > 1 && <> e <span className="font-semibold text-foreground">outros {post.likes_count - 1}</span></>}
          </p>
        </div>
      )}

      {/* Caption below image */}
      {post.content && post.image_url && (
        <div className="px-4 pb-3.5">
          <p className="text-[14px] text-foreground leading-relaxed">
            <span className="font-bold text-primary mr-1.5">@{username}</span>
            {post.content}
          </p>
        </div>
      )}
    </motion.article>
  );
}
