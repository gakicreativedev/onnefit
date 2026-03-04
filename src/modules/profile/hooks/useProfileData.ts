import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useXP } from "@/modules/gamification/hooks/useXP";
import { useStreak } from "@/modules/gamification/hooks/useStreak";
import { useHighlights } from "@/modules/profile/hooks/useHighlights";
import { useStories, type StoryGroup } from "@/modules/social/hooks/useStories";
import type { FeedPost } from "@/modules/social/hooks/useFeed";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { calculateBMR, calculateCalorieTarget } from "@/lib/nutrition";
import { toast } from "sonner";

export interface UserPost {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    likes_count: number;
    comments_count: number;
}

export function useProfileData(profile: Profile) {
    const { user } = useAuth();
    const { level, history: xpHistory, loading: xpLoading } = useXP(user?.id);
    const { streak } = useStreak(user?.id);
    const { highlights, createHighlight, updateHighlight, deleteHighlight: removeHighlight } = useHighlights(user?.id);
    const { storyGroups, createStory, hasMyStory } = useStories();

    const [userPosts, setUserPosts] = useState<UserPost[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [myRecipes, setMyRecipes] = useState<any[]>([]);
    const [savedRecipes, setSavedRecipes] = useState<any[]>([]);
    const [myWorkouts, setMyWorkouts] = useState<any[]>([]);
    const [savedWorkouts, setSavedWorkouts] = useState<any[]>([]);
    const [detailPost, setDetailPost] = useState<FeedPost | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: profile.name || "",
        age: profile.age || 25,
        gender: profile.gender || "male",
        height_cm: profile.height_cm || 175,
        weight_kg: profile.weight_kg || 70,
        goal: profile.goal || "maintain",
        activity_level: profile.activity_level || "moderate",
        injuries: profile.injuries || [],
        allergies: profile.allergies || [],
        dietary_restrictions: profile.dietary_restrictions || [],
    });

    const storyInputRef = useRef<HTMLInputElement>(null);
    const myStoryGroup = storyGroups.find((g) => g.user_id === user?.id) || null;

    // ── Fetch all profile data ──
    useEffect(() => {
        if (!user?.id) return;
        const fetchAll = async () => {
            const [postsRes, followersRes, followingRes, myRecipesRes, bookmarksRes, myWorkoutsRes, workoutBookmarksRes] = await Promise.all([
                supabase.from("posts").select("id, content, image_url, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
                supabase.from("follows").select("id").eq("following_id", user.id).eq("status", "accepted"),
                supabase.from("follows").select("id").eq("follower_id", user.id).eq("status", "accepted"),
                supabase.from("recipes").select("id, title, image_url, calories, protein, category, cost_level, created_at").eq("created_by", user.id).order("created_at", { ascending: false }),
                supabase.from("recipe_bookmarks").select("recipe_id").eq("user_id", user.id),
                supabase.from("workouts").select("id, name, description, difficulty, duration_minutes, muscle_groups, is_shared, day_of_week").eq("user_id", user.id).order("created_at", { ascending: false }),
                supabase.from("workout_bookmarks").select("workout_id").eq("user_id", user.id),
            ]);
            const rawPosts = postsRes.data || [];
            setFollowersCount((followersRes.data || []).length);
            setFollowingCount((followingRes.data || []).length);
            setMyRecipes(myRecipesRes.data || []);
            setMyWorkouts(myWorkoutsRes.data || []);

            const bookmarkIds = (bookmarksRes.data || []).map((b: any) => b.recipe_id);
            if (bookmarkIds.length > 0) {
                const { data: savedData } = await supabase.from("recipes").select("id, title, image_url, calories, protein, category, cost_level, created_at").in("id", bookmarkIds);
                setSavedRecipes(savedData || []);
            } else { setSavedRecipes([]); }

            const workoutBookmarkIds = (workoutBookmarksRes.data || []).map((b: any) => b.workout_id);
            if (workoutBookmarkIds.length > 0) {
                const { data: savedWData } = await supabase.from("workouts").select("id, name, description, difficulty, duration_minutes, muscle_groups, is_shared, day_of_week").in("id", workoutBookmarkIds);
                setSavedWorkouts(savedWData || []);
            } else { setSavedWorkouts([]); }

            if (rawPosts.length === 0) { setUserPosts([]); return; }
            const postIds = rawPosts.map((p) => p.id);
            const [likesRes, commentsRes] = await Promise.all([
                supabase.from("post_likes").select("post_id").in("post_id", postIds),
                supabase.from("post_comments").select("post_id").in("post_id", postIds),
            ]);
            const likesMap = new Map<string, number>();
            (likesRes.data || []).forEach((l) => likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1));
            const commentsMap = new Map<string, number>();
            (commentsRes.data || []).forEach((c) => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));
            setUserPosts(rawPosts.map((p) => ({ ...p, likes_count: likesMap.get(p.id) || 0, comments_count: commentsMap.get(p.id) || 0 })));
        };
        fetchAll();
    }, [user?.id]);

    // ── Profile save handler ──
    const handleSave = useCallback(async (onUpdate: (data: Partial<Profile>) => Promise<any>) => {
        setSaving(true);
        const bmr = calculateBMR(form.gender, form.weight_kg, form.height_cm, form.age);
        const calorie_target = calculateCalorieTarget(bmr, form.activity_level, form.goal);
        const result = await onUpdate({ ...form, bmr, calorie_target });
        if (result?.error) { toast.error("Erro ao atualizar perfil"); }
        else { toast.success("Perfil atualizado!"); }
        setSaving(false);
    }, [form]);

    // ── Post detail interactions ──
    const openPostDetail = useCallback(async (post: UserPost) => {
        const feedPost: FeedPost = {
            ...post, user_id: user!.id, location: null, tags: [],
            author: { name: profile.name, username: profile.username, avatar_url: profile.avatar_url, is_verified: profile.is_verified },
            is_liked: false, is_bookmarked: false, recent_likers: [],
        };
        const [likeRes, bmRes] = await Promise.all([
            supabase.from("post_likes").select("id").eq("post_id", post.id).eq("user_id", user!.id).maybeSingle(),
            supabase.from("post_bookmarks").select("id").eq("post_id", post.id).eq("user_id", user!.id).maybeSingle(),
        ]);
        feedPost.is_liked = !!likeRes.data;
        feedPost.is_bookmarked = !!bmRes.data;
        setDetailPost(feedPost);
    }, [user, profile]);

    const handleDetailLike = useCallback(async (postId: string) => {
        if (!user || !detailPost) return;
        if (detailPost.is_liked) {
            await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        } else {
            await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        }
        setDetailPost(prev => prev ? { ...prev, is_liked: !prev.is_liked, likes_count: prev.is_liked ? prev.likes_count - 1 : prev.likes_count + 1 } : null);
        setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: detailPost.is_liked ? p.likes_count - 1 : p.likes_count + 1 } : p));
    }, [user, detailPost]);

    const handleDetailBookmark = useCallback(async (postId: string) => {
        if (!user || !detailPost) return;
        if (detailPost.is_bookmarked) {
            await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
        } else {
            await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user.id });
        }
        setDetailPost(prev => prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : null);
    }, [user, detailPost]);

    const handleDetailEdit = useCallback(async (postId: string, content: string) => {
        if (!user) return;
        await supabase.from("posts").update({ content }).eq("id", postId).eq("user_id", user.id);
        setDetailPost(prev => prev ? { ...prev, content } : null);
        setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
    }, [user]);

    const handleDetailDelete = useCallback(async (postId: string) => {
        if (!user) return;
        await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);
        setUserPosts(prev => prev.filter(p => p.id !== postId));
    }, [user]);

    const handleDetailCommentCount = useCallback((postId: string, delta: number) => {
        setDetailPost(prev => prev ? { ...prev, comments_count: Math.max(0, prev.comments_count + delta) } : null);
        setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p));
    }, []);

    // ── Story handlers ──
    const handleAddStory = useCallback(() => storyInputRef.current?.click(), []);

    const handleStoryFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { await createStory(file); toast.success("Story publicado!"); }
        e.target.value = "";
    }, [createStory]);

    // ── Highlight handlers ──
    const saveHighlight = useCallback(async (highlightForm: { label: string; icon: string }, editingId?: string) => {
        if (!highlightForm.label || !highlightForm.icon) { toast.error("Preencha todos os campos"); return; }
        if (editingId) { await updateHighlight(editingId, highlightForm.label, highlightForm.icon); }
        else { await createHighlight(highlightForm.label, highlightForm.icon); }
        toast.success("Destaque salvo!");
    }, [updateHighlight, createHighlight]);

    const handleDeleteHighlight = useCallback(async (id: string) => {
        await removeHighlight(id);
        toast.success("Destaque removido!");
    }, [removeHighlight]);

    return {
        user, level, xpHistory, xpLoading, streak,
        highlights, storyGroups, hasMyStory, myStoryGroup,
        userPosts, followersCount, followingCount,
        myRecipes, savedRecipes, myWorkouts, savedWorkouts,
        detailPost, setDetailPost,
        form, setForm, saving, handleSave,
        storyInputRef, handleAddStory, handleStoryFile,
        saveHighlight, handleDeleteHighlight,
        openPostDetail, handleDetailLike, handleDetailBookmark, handleDetailEdit, handleDetailDelete, handleDetailCommentCount,
    };
}
