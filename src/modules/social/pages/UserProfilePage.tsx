import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FeedPostCard } from "../components/FeedPostCard";
import { CommentsDrawer } from "../components/CommentsDrawer";
import { PostDetailDialog } from "../components/PostDetailDialog";
import type { FeedPost } from "../hooks/useFeed";
import { ArrowLeft } from "lucide-react";
import { DumbbellBold, ChefHatBold, VerifiedCheckBold, WidgetBold, LinkBold, BookmarkBold, LockBold } from "solar-icon-set";
import RecipeDetailDialog from "@/modules/diet/components/RecipeDetailDialog";
import type { Recipe } from "@/modules/diet/hooks/useRecipes";

interface UserProfile {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  goal: string | null;
  is_verified: boolean;
  is_private: boolean;
}

interface SharedWorkout {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  muscle_groups: string[] | null;
}

interface SharedMealPlan {
  id: string;
  date: string;
  total_calories: number | null;
}

interface SharedRecipe {
  id: string;
  title: string;
  image_url: string | null;
  calories: number | null;
  protein: number | null;
  category: string | null;
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [sharedWorkouts, setSharedWorkouts] = useState<SharedWorkout[]>([]);
  const [sharedMealPlans, setSharedMealPlans] = useState<SharedMealPlan[]>([]);
  const [sharedRecipes, setSharedRecipes] = useState<SharedRecipe[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [isMutualFollower, setIsMutualFollower] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "workouts" | "diets" | "recipes">("posts");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [workoutBookmarks, setWorkoutBookmarks] = useState<Set<string>>(new Set());

  const isOwnProfile = user?.id === userId;

  const fetchAll = useCallback(async () => {
    if (!userId || !user) return;
    setLoading(true);

    const [profileRes, followersRes, followingRes, isFollowingRes, postsRes, workoutsRes, mealPlansRes, recipesRes, mutualRes] = await Promise.all([
      supabase.from("public_profiles").select("user_id, name, username, avatar_url, goal, is_verified, is_private").eq("user_id", userId).single(),
      supabase.from("follows").select("id").eq("following_id", userId).eq("status", "accepted"),
      supabase.from("follows").select("id").eq("follower_id", userId).eq("status", "accepted"),
      supabase.from("follows").select("id, status").eq("follower_id", user.id).eq("following_id", userId).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("workouts").select("id, name, description, difficulty, duration_minutes, muscle_groups").eq("user_id", userId).eq("is_shared", true),
      supabase.from("meal_plans").select("id, date, total_calories").eq("user_id", userId).eq("is_shared", true).order("date", { ascending: false }).limit(20),
      supabase.from("recipes").select("id, title, image_url, calories, protein, category").eq("created_by", userId).eq("is_shared", true),
      supabase.rpc("are_mutual_followers", { user_a: user.id, user_b: userId }),
    ]);

    const profileData = profileRes.data as UserProfile | null;
    setProfile(profileData);
    setFollowersCount((followersRes.data || []).length);
    setFollowingCount((followingRes.data || []).length);
    const followData = isFollowingRes.data;
    const fStatus = followData ? (followData as any).status || "accepted" : null;
    setIsFollowing(fStatus === "accepted");
    setFollowStatus(fStatus);
    setIsMutualFollower(!!mutualRes.data);
    setSharedWorkouts((workoutsRes.data || []) as SharedWorkout[]);
    setSharedMealPlans((mealPlansRes.data || []) as SharedMealPlan[]);
    setSharedRecipes((recipesRes.data || []) as SharedRecipe[]);

    // Fetch user's workout bookmarks
    const { data: wbData } = await supabase.from("workout_bookmarks").select("workout_id").eq("user_id", user.id);
    setWorkoutBookmarks(new Set((wbData || []).map((b: any) => b.workout_id)));

    // Enrich posts
    const rawPosts = postsRes.data || [];
    if (rawPosts.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = rawPosts.map(p => p.id);
    const [likesRes, commentsRes, userLikesRes, userBookmarksRes] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
    ]);

    const likesCount = new Map<string, number>();
    (likesRes.data || []).forEach(l => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1));
    const commentsCount = new Map<string, number>();
    (commentsRes.data || []).forEach(c => commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1));
    const userLikedSet = new Set((userLikesRes.data || []).map(l => l.post_id));
    const userBookmarkSet = new Set((userBookmarksRes.data || []).map(b => b.post_id));

    const authorName = profileRes.data?.name || "Usuário";
    const authorUsername = profileRes.data?.username || null;
    const authorAvatar = profileRes.data?.avatar_url || null;
    const authorVerified = profileRes.data?.is_verified || false;

    setPosts(rawPosts.map(post => ({
      ...post,
      author: { name: authorName, username: authorUsername, avatar_url: authorAvatar, is_verified: authorVerified },
      likes_count: likesCount.get(post.id) || 0,
      comments_count: commentsCount.get(post.id) || 0,
      is_liked: userLikedSet.has(post.id),
      is_bookmarked: userBookmarkSet.has(post.id),
      recent_likers: [],
    })));
    setLoading(false);
  }, [userId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleFollow = async () => {
    if (!user || !userId || isOwnProfile) return;
    
    if (isFollowing || followStatus === "pending") {
      // Unfollow or cancel pending request
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      if (followStatus === "accepted") setFollowersCount(c => c - 1);
      setIsFollowing(false);
      setFollowStatus(null);
    } else {
      // New follow — check if private
      const isPrivate = profile?.is_private;
      const status = isPrivate ? "pending" : "accepted";
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId, status });
      
      if (status === "accepted") {
        setIsFollowing(true);
        setFollowersCount(c => c + 1);
      }
      setFollowStatus(status);

      if (status === "pending") {
        await supabase.from("notifications").insert({
          user_id: userId,
          actor_id: user.id,
          type: "follow_request",
          content: null,
          post_id: null,
        });
      }
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.is_liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
    } : p));
  };

  const handleToggleBookmark = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.is_bookmarked) {
      await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user.id });
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: !p.is_bookmarked } : p));
  };

  const handleUpdatePost = async (postId: string, content: string) => {
    if (!user) return;
    const contentTags = (content.match(/#(\w+)/g) || []).map(t => t.replace("#", "").toLowerCase());
    await supabase.from("posts").update({ content, tags: contentTags }).eq("id", postId).eq("user_id", user.id);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content, tags: contentTags } : p));
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p));
  };

  const handleToggleWorkoutBookmark = async (workoutId: string) => {
    if (!user) return;
    if (workoutBookmarks.has(workoutId)) {
      await supabase.from("workout_bookmarks").delete().eq("workout_id", workoutId).eq("user_id", user.id);
      setWorkoutBookmarks(prev => { const next = new Set(prev); next.delete(workoutId); return next; });
    } else {
      await supabase.from("workout_bookmarks").insert({ user_id: user.id, workout_id: workoutId });
      setWorkoutBookmarks(prev => new Set(prev).add(workoutId));
    }
  };

  const displayName = profile?.name || "Usuário";
  const username = profile?.username || displayName;

  const goalLabels: Record<string, string> = {
    lose_weight: "Perder Peso",
    gain_muscle: "Ganhar Músculo",
    recomposition: "Recomposição",
    maintain: "Manter",
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Usuário não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const tabs = [
    { key: "posts" as const, label: "Posts", count: posts.length },
    { key: "recipes" as const, label: "Receitas", count: sharedRecipes.length },
    { key: "workouts" as const, label: "Treinos", count: sharedWorkouts.length },
    { key: "diets" as const, label: "Dietas", count: sharedMealPlans.length },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors w-8">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-foreground">@{username}</span>
        <div className="w-8" />
      </div>

      {/* Profile header — matching own profile layout */}
      <div className="flex flex-col items-center gap-5 px-5 pt-2 pb-5">
        {/* Stats row with avatar center */}
        <div className="flex items-center justify-center gap-6 w-full max-w-[280px]">
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-black text-foreground leading-none">{followersCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Seguidores</p>
          </div>

          <div className="relative flex-shrink-0">
            <div className="h-[88px] w-[88px] rounded-full overflow-hidden bg-card flex items-center justify-center ring-[3px] ring-foreground/20 ring-offset-2 ring-offset-background">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>

          <div className="text-center min-w-[60px]">
            <p className="text-lg font-black text-foreground leading-none">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Seguindo</p>
          </div>
        </div>

        {/* Name and info */}
        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
            {profile.is_verified && <VerifiedCheckBold size={16} color="hsl(var(--primary))" />}
          </div>
          <p className="text-sm text-muted-foreground">@{username}</p>
          {profile.goal && (
            <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary">
              {goalLabels[profile.goal] || profile.goal}
            </span>
          )}
        </div>

        {/* Follow button */}
        {!isOwnProfile && (
          <div className="w-full max-w-[280px]">
            <Button
              onClick={handleToggleFollow}
              variant={isFollowing ? "outline" : followStatus === "pending" ? "outline" : "default"}
              className="w-full rounded-xl font-bold text-sm h-9"
            >
              {isFollowing ? "Seguindo" : followStatus === "pending" ? "Solicitado" : "Seguir"}
            </Button>
          </div>
        )}
      </div>

      {/* Private profile wall */}
      {profile.is_private && !isOwnProfile && !isMutualFollower ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <LockBold size={28} color="hsl(var(--muted-foreground))" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Conta Privada</h3>
          <p className="text-sm text-muted-foreground text-center max-w-[260px]">
            Siga este perfil e aguarde a aprovação para ver publicações, treinos e receitas.
          </p>
        </div>
      ) : (
      <>

      {/* Tabs — icon-only like own profile */}
      <div className="flex border-b border-border px-2">
        {tabs.map(tab => {
          const icons: Record<string, any> = { posts: WidgetBold, recipes: ChefHatBold, workouts: DumbbellBold, diets: ChefHatBold };
          const Icon = icons[tab.key] || WidgetBold;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon size={18} color="currentColor" />
              {tab.count > 0 && <span className="text-[10px] font-bold opacity-70">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "posts" && (
        <div className="p-4 space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <WidgetBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhuma publicação ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  onLike={handleToggleLike}
                  onBookmark={handleToggleBookmark}
                  onComment={setCommentPostId}
                  onOpenDetail={setDetailPost}
                  isOwnPost={isOwnProfile}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "recipes" && (
        <div className="p-4 space-y-3">
          {sharedRecipes.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <ChefHatBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhuma receita compartilhada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sharedRecipes.map(r => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-card overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={async () => {
                    const { data } = await supabase.from("recipes").select("*").eq("id", r.id).single();
                    if (data) {
                      setSelectedRecipe(data as Recipe);
                      setRecipeDialogOpen(true);
                    }
                  }}
                >
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
                    ) : (
                      <ChefHatBold size={28} color="currentColor" className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-bold text-card-foreground line-clamp-1">{r.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.calories || 0} kcal · {r.protein || 0}g prot</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "workouts" && (
        <div className="p-4 space-y-3">
          {sharedWorkouts.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <DumbbellBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhum treino compartilhado</p>
            </div>
          ) : (
            sharedWorkouts.map(w => (
              <div key={w.id} className="rounded-2xl bg-card p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <DumbbellBold size={20} color="currentColor" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-card-foreground">{w.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {w.difficulty && <span className="capitalize">{w.difficulty}</span>}
                      {w.duration_minutes && <span>· {w.duration_minutes} min</span>}
                    </div>
                  </div>
                  {!isOwnProfile && (
                    <button
                      onClick={() => handleToggleWorkoutBookmark(w.id)}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${workoutBookmarks.has(w.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      <BookmarkBold size={16} color="currentColor" />
                    </button>
                  )}
                </div>
                {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                {w.muscle_groups && w.muscle_groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {w.muscle_groups.map(mg => (
                      <span key={mg} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">{mg}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "diets" && (
        <div className="p-4 space-y-3">
          {sharedMealPlans.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <ChefHatBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhuma dieta compartilhada</p>
            </div>
          ) : (
            sharedMealPlans.map(mp => (
              <div key={mp.id} className="rounded-2xl bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <ChefHatBold size={20} color="currentColor" className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-card-foreground">Plano de {mp.date}</h3>
                    <p className="text-xs text-muted-foreground">{mp.total_calories || 0} kcal</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={recipeDialogOpen}
        onOpenChange={setRecipeDialogOpen}
      />

      <CommentsDrawer
        postId={commentPostId}
        onClose={() => setCommentPostId(null)}
        onCommentCountChange={handleCommentCountChange}
      />

      <PostDetailDialog
        post={detailPost}
        open={!!detailPost}
        onOpenChange={(v) => { if (!v) setDetailPost(null); }}
        onLike={handleToggleLike}
        onBookmark={handleToggleBookmark}
        onEdit={isOwnProfile ? handleUpdatePost : undefined}
        onDelete={isOwnProfile ? handleDeletePost : undefined}
        onCommentCountChange={handleCommentCountChange}
      />
      </>
      )}
    </div>
  );
}
