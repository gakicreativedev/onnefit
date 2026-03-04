import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeed, type FeedPost } from "../hooks/useFeed";
import { useStories, type StoryGroup } from "../hooks/useStories";
import { useFollows } from "../hooks/useFollows";
import { useNotifications } from "../hooks/useNotifications";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useDirectMessages } from "../hooks/useDirectMessages";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useProfile } from "@/modules/auth/hooks/useProfile";
import { StoriesCarousel } from "../components/StoriesCarousel";
import { FeedPostCard } from "../components/FeedPostCard";
import { CreatePostDialog } from "../components/CreatePostDialog";
import { PostDetailDialog } from "../components/PostDetailDialog";
import { StoryViewer } from "../components/StoryViewer";
import { DiscoverDialog } from "../components/DiscoverDialog";
import { CommentsDrawer } from "../components/CommentsDrawer";
import { NotificationsDrawer } from "../components/NotificationsDrawer";
import { FeedSearchBar } from "../components/FeedSearchBar";
import { ChatDrawer } from "../components/ChatDrawer";
import { AddCircleBold, UserPlusBold, BellBold, RefreshBold, PlainBold, WomenBold, ConfettiBold, BookmarkBold } from "solar-icon-set";

export default function SocialFeedPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const isFemale = profile?.gender === "female";
  const { posts, loading, loadingMore, hasMore, activeTag, toggleLike, toggleBookmark, createPost, updatePost, deletePost, filterByTag, clearTagFilter, refetch, fetchMore, updateCommentCount } = useFeed();
  const { storyGroups, createStory } = useStories();
  const { followingCount, followersCount, toggleFollow, isFollowing } = useFollows();
  const { unreadCount } = useNotifications();
  const { totalUnread: dmUnread } = useDirectMessages();
  const [createOpen, setCreateOpen] = useState(false);
  const [womenOnlyPostOpen, setWomenOnlyPostOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInitialUser, setChatInitialUser] = useState<{ id: string; name: string } | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [viewingStory, setViewingStory] = useState<StoryGroup | null>(null);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);
  const womenStoryInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [feedMode, setFeedMode] = useState<"feed" | "salvos">("feed");

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, fetchMore]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const { containerRef, pullDistance, refreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const handleAddStory = () => {
    storyInputRef.current?.click();
  };

  const handleStoryFile = async (e: React.ChangeEvent<HTMLInputElement>, womenOnly = false) => {
    const file = e.target.files?.[0];
    if (file) await createStory(file, womenOnly);
    e.target.value = "";
  };

  const handleFollow = async (userId: string) => {
    await toggleFollow(userId);
    setTimeout(() => refetch(), 300);
  };

  const handleOpenDM = (userId: string, name: string) => {
    setChatInitialUser({ id: userId, name });
    setChatOpen(true);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-3 max-w-lg mx-auto pb-24 relative">
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || refreshing) && (
          <motion.div
            className="flex items-center justify-center overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: refreshing ? 48 : pullDistance,
              opacity: refreshing ? 1 : progress,
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: refreshing ? 0.2 : 0 }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: progress * 360 }}
              transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              className="flex items-center justify-center"
            >
              <RefreshBold
                size={22}
                color={progress >= 1 || refreshing ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-1 gap-2">
        <div className="flex items-center gap-4 shrink-0">
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Feed</h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Salvos toggle */}
          <motion.button
            onClick={() => setFeedMode(feedMode === "feed" ? "salvos" : "feed")}
            whileTap={{ scale: 0.9 }}
            className={`relative flex items-center justify-center h-9 w-9 rounded-full border border-border/50 transition-colors ${feedMode === "salvos" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted/50"}`}
            title="Itens salvos"
          >
            <BookmarkBold size={16} color="currentColor" />
          </motion.button>
          {/* DM button */}
          <motion.button
            onClick={() => { setChatInitialUser(null); setChatOpen(true); }}
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center h-9 w-9 rounded-full bg-card border border-border/50 text-foreground hover:bg-muted/50 transition-colors"
          >
            <PlainBold size={16} color="currentColor" />
            {dmUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-1">
                {dmUnread > 99 ? "99+" : dmUnread}
              </span>
            )}
          </motion.button>
          <motion.button
            onClick={() => setNotificationsOpen(true)}
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center h-9 w-9 rounded-full bg-card border border-border/50 text-foreground hover:bg-muted/50 transition-colors"
          >
            <BellBold size={16} color="currentColor" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
          <motion.button
            onClick={() => setDiscoverOpen(true)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-primary-foreground text-xs font-bold hover:brightness-110 transition-all whitespace-nowrap"
          >
            <UserPlusBold size={14} color="currentColor" />
            Descobrir
          </motion.button>
        </div>
      </div>

      {/* Search Bar */}
      <FeedSearchBar
        onTagSelect={filterByTag}
        activeTag={activeTag}
        onClearTag={clearTagFilter}
      />

      {/* Stories */}
      <StoriesCarousel
        storyGroups={storyGroups}
        onAddStory={handleAddStory}
        onViewStory={setViewingStory}
        currentUserId={user?.id}
      />

      {/* Divider */}
      <div className="h-px bg-border/40 mx-2" />

      {/* Create actions bar */}
      <div className="flex items-center gap-2 px-1">
        <motion.button
          onClick={() => setCreateOpen(true)}
          whileTap={{ scale: 0.95 }}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
        >
          <AddCircleBold size={18} color="currentColor" />
          Novo Post
        </motion.button>
        {isFemale && (
          <motion.button
            onClick={() => setWomenOnlyPostOpen(true)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 rounded-xl bg-destructive py-2.5 px-4 text-destructive-foreground text-sm font-bold hover:brightness-110 transition-all"
            title="Post apenas para mulheres"
          >
            <WomenBold size={18} color="currentColor" />
            Feminino
          </motion.button>
        )}
      </div>

      {/* Feed */}
      <AnimatePresence mode="wait">
        {loading && !refreshing ? (
          <motion.div
            key="skeleton"
            className="flex flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-card border border-border/30 overflow-hidden">
                <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3.5 w-28 rounded-full bg-muted animate-pulse" />
                    <div className="h-2.5 w-20 rounded-full bg-muted/60 animate-pulse" />
                  </div>
                  <div className="h-7 w-16 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="w-full aspect-[4/5] bg-muted animate-pulse" />
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-8 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="h-8 w-12 rounded-full bg-muted/60 animate-pulse" />
                  <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
                  <div className="flex-1" />
                  <div className="h-8 w-8 rounded-full bg-muted/40 animate-pulse" />
                </div>
                <div className="px-4 pb-3.5 flex flex-col gap-1.5">
                  <div className="h-3 w-3/4 rounded-full bg-muted/50 animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-muted/30 animate-pulse" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card p-10 text-center flex flex-col items-center gap-4 border border-border/50"
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlusBold size={32} color="hsl(var(--primary))" />
            </div>
            <div>
              <p className="text-foreground font-bold text-base mb-1">
                {activeTag ? `Nenhum post com #${activeTag}` : "Seu feed está vazio"}
              </p>
              <p className="text-muted-foreground text-sm">
                {activeTag ? "Tente buscar por outra tag." : "Siga pessoas para ver seus posts aqui!"}
              </p>
            </div>
            {!activeTag && (
              <motion.button
                onClick={() => setDiscoverOpen(true)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-primary-foreground text-sm font-bold hover:brightness-110 transition-all mt-1"
              >
                <UserPlusBold size={16} color="currentColor" />
                Descobrir Pessoas
              </motion.button>
            )}
          </motion.div>
        ) : (() => {
          const displayPosts = feedMode === "salvos" ? posts.filter(p => p.is_bookmarked) : posts;
          return displayPosts.length === 0 ? (
            <motion.div
              key="empty-salvos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-10 text-center flex flex-col items-center gap-3 border border-border/50"
            >
              <BookmarkBold size={32} color="hsl(var(--muted-foreground))" />
              <p className="text-foreground font-bold text-base">
                {feedMode === "salvos" ? "Nenhum post salvo" : "Sem posts"}
              </p>
              <p className="text-muted-foreground text-sm">
                {feedMode === "salvos" ? "Toque no ícone de bookmark para salvar posts." : "Tente novamente."}
              </p>
            </motion.div>
          ) : (
            <motion.div key="feed" className="flex flex-col gap-3">
              {displayPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  onLike={toggleLike}
                  onBookmark={toggleBookmark}
                  onComment={(postId) => setCommentPostId(postId)}
                  onFollow={handleFollow}
                  onTagClick={filterByTag}
                  onOpenDetail={setDetailPost}
                  isFollowing={isFollowing(post.user_id)}
                  isOwnPost={post.user_id === user?.id}
                />
              ))}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Infinite scroll sentinel + loading */}
      {!loading && posts.length > 0 && (
        <div ref={sentinelRef} className="flex items-center justify-center py-6">
          {loadingMore ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            >
              <RefreshBold size={20} color="hsl(var(--muted-foreground))" />
            </motion.div>
          ) : !hasMore ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">Você viu todos os posts <ConfettiBold size={14} color="hsl(var(--primary))" /></span>
          ) : null}
        </div>
      )}

      {/* Dialogs */}
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} onSubmit={createPost} />
      {isFemale && <CreatePostDialog open={womenOnlyPostOpen} onOpenChange={setWomenOnlyPostOpen} onSubmit={createPost} womenOnly />}
      <DiscoverDialog open={discoverOpen} onOpenChange={setDiscoverOpen} />
      <CommentsDrawer postId={commentPostId} onClose={() => setCommentPostId(null)} onCommentCountChange={updateCommentCount} />
      <PostDetailDialog
        post={detailPost}
        open={!!detailPost}
        onOpenChange={(v) => { if (!v) setDetailPost(null); }}
        onLike={toggleLike}
        onBookmark={toggleBookmark}
        onEdit={updatePost}
        onDelete={deletePost}
        onCommentCountChange={updateCommentCount}
      />
      <NotificationsDrawer open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <StoryViewer group={viewingStory} onClose={() => setViewingStory(null)} onOpenDM={handleOpenDM} />
      <ChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        initialUserId={chatInitialUser?.id}
        initialUserName={chatInitialUser?.name}
      />
      <input ref={storyInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleStoryFile(e)} />
      <input type="file" accept="image/*" capture="environment" className="hidden" ref={(el) => { if (el) el.dataset.storyCamera = "true"; }} onChange={(e) => handleStoryFile(e)} />
      {isFemale && <input ref={womenStoryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleStoryFile(e, true)} />}
      {isFemale && <input type="file" accept="image/*" capture="environment" className="hidden" ref={(el) => { if (el) el.dataset.womenStoryCamera = "true"; }} onChange={(e) => handleStoryFile(e, true)} />}
    </div>
  );
}
