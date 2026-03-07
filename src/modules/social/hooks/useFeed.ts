import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  location: string | null;
  created_at: string;
  tags: string[];
  author: {
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  recent_likers: string[];
  _score?: number;
  group?: {
    id: string;
    name: string;
  };
  type?: "post" | "group_activity";
}

function rankPosts(posts: FeedPost[], followingIds: Set<string>, userId: string): FeedPost[] {
  const now = Date.now();

  const scored = posts.map(post => {
    const ageHours = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.exp(-0.058 * ageHours) * 40;
    const engagementScore = Math.min((post.likes_count * 2 + post.comments_count * 3) * 1.5, 30);
    const relationshipScore = followingIds.has(post.user_id) ? 15 : 0;
    const ownPostScore = post.user_id === userId ? 10 : 0;
    const contentScore = post.image_url ? 5 : 0;

    const totalScore = recencyScore + engagementScore + relationshipScore + ownPostScore + contentScore;
    return { ...post, _score: totalScore };
  });

  scored.sort((a, b) => (b._score || 0) - (a._score || 0));
  return scored;
}

const PAGE_SIZE = 20;

export function useFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [followingIdsSet, setFollowingIdsSet] = useState<Set<string>>(new Set());
  const pageRef = useRef(0);

  const enrichPosts = useCallback(async (rawPosts: any[], userId: string, followSet: Set<string>): Promise<FeedPost[]> => {
    const userIds = [...new Set(rawPosts.map(p => p.user_id))];
    const postIds = rawPosts.map(p => p.id);

    if (postIds.length === 0) return [];

    const [profilesRes, likesCountRes, commentsCountRes, userLikesRes, userBookmarksRes, recentLikersRes] = await Promise.all([
      supabase.from("public_profiles").select("user_id, name, username, avatar_url, is_verified").in("user_id", userIds),
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("post_comments").select("post_id").in("post_id", postIds),
      supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
      supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds),
      supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds).limit(200),
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

    const likesCount = new Map<string, number>();
    (likesCountRes.data || []).forEach(l => likesCount.set(l.post_id, (likesCount.get(l.post_id) || 0) + 1));

    const commentsCount = new Map<string, number>();
    (commentsCountRes.data || []).forEach(c => commentsCount.set(c.post_id, (commentsCount.get(c.post_id) || 0) + 1));

    const userLikedSet = new Set((userLikesRes.data || []).map(l => l.post_id));
    const userBookmarkSet = new Set((userBookmarksRes.data || []).map(b => b.post_id));

    const likerUserIds = [...new Set((recentLikersRes.data || []).map(l => l.user_id))];
    const { data: likerProfiles } = likerUserIds.length > 0
      ? await supabase.from("public_profiles").select("user_id, name").in("user_id", likerUserIds)
      : { data: [] };
    const likerNameMap = new Map((likerProfiles || []).map(p => [p.user_id, p.name || "Usuário"]));

    const likersByPost = new Map<string, string[]>();
    (recentLikersRes.data || []).forEach(l => {
      const arr = likersByPost.get(l.post_id) || [];
      const name = likerNameMap.get(l.user_id) || "Usuário";
      if (arr.length < 3 && !arr.includes(name)) arr.push(name);
      likersByPost.set(l.post_id, arr);
    });

    return rawPosts.map(post => {
      const profile = profileMap.get(post.user_id);
      return {
        ...post,
        tags: (post.tags as string[]) || [],
        author: {
          name: profile?.name || "Usuário",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          is_verified: profile?.is_verified || false,
        },
        likes_count: likesCount.get(post.id) || 0,
        comments_count: commentsCount.get(post.id) || 0,
        is_liked: userLikedSet.has(post.id),
        is_bookmarked: userBookmarkSet.has(post.id),
        recent_likers: likersByPost.get(post.id) || [],
        group: post.group || undefined,
        type: post.type || "post",
      };
    });
  }, []);

  const fetchPosts = useCallback(async (tagFilter?: string | null) => {
    if (!user) return;
    setLoading(true);
    pageRef.current = 0;
    setHasMore(true);

    const { data: followsData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = (followsData || []).map(f => f.following_id);
    const followSet = new Set(followingIds);
    setFollowingIdsSet(followSet);

    const { data: userGroups } = await supabase
      .from("group_members")
      .select("group_id, groups!inner(id, name)")
      .eq("user_id", user.id);

    const groupIds = (userGroups || []).map(g => g.group_id);
    const groupMap = new Map((userGroups || []).map(g => [g.group_id, (g as any).groups]));

    const allowedUserIds = [user.id, ...followingIds];

    let queryPosts = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (tagFilter) {
      queryPosts = queryPosts.contains("tags", [tagFilter]);
    } else {
      queryPosts = queryPosts.in("user_id", allowedUserIds);
    }

    const { data: rawPosts } = await queryPosts;
    let combinedFeed: any[] = (rawPosts || []).map(p => ({ ...p, type: "post" }));

    if (!tagFilter && groupIds.length > 0) {
      // @ts-ignore
      const { data: rawActivities } = await supabase
        .from("group_activities")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (rawActivities) {
        const mappedActivities = rawActivities.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          content: a.description || "Completou uma atividade no grupo!",
          image_url: a.photo_url || a.image_url,
          location: null,
          created_at: a.created_at,
          tags: [],
          type: "group_activity" as const,
          women_only: false,
          group: groupMap.get(a.group_id) || { id: a.group_id, name: "Grupo" }
        }));
        combinedFeed = [...combinedFeed, ...mappedActivities];
      }
    }

    if (combinedFeed.length === 0) {
      setPosts([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    if (rawPosts && rawPosts.length < PAGE_SIZE) setHasMore(false);

    const enriched = await enrichPosts(combinedFeed, user.id, followSet);
    const ranked = rankPosts(enriched, followSet, user.id);
    setPosts(ranked);
    setLoading(false);
  }, [user, enrichPosts]);

  const fetchMorePosts = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;
    setLoadingMore(true);
    pageRef.current += 1;
    const from = pageRef.current * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data: followsData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = (followsData || []).map(f => f.following_id);
    const followSet = new Set(followingIds);
    const allowedUserIds = [user.id, ...followingIds];

    const { data: userGroups } = await supabase
      .from("group_members")
      .select("group_id, groups!inner(id, name)")
      .eq("user_id", user.id);

    const groupIds = (userGroups || []).map(g => g.group_id);
    const groupMap = new Map((userGroups || []).map(g => [g.group_id, (g as any).groups]));

    let queryPosts = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (activeTag) {
      queryPosts = queryPosts.contains("tags", [activeTag]);
    } else {
      queryPosts = queryPosts.in("user_id", allowedUserIds);
    }

    const { data: rawPosts } = await queryPosts;
    let combinedFeed: any[] = (rawPosts || []).map(p => ({ ...p, type: "post" }));

    if (!activeTag && groupIds.length > 0) {
      // @ts-ignore
      const { data: rawActivities } = await supabase
        .from("group_activities")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (rawActivities) {
        const mappedActivities = rawActivities.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          content: a.description || "Completou uma atividade no grupo!",
          image_url: a.photo_url || a.image_url,
          location: null,
          created_at: a.created_at,
          tags: [],
          type: "group_activity" as const,
          women_only: false,
          group: groupMap.get(a.group_id) || { id: a.group_id, name: "Grupo" }
        }));
        combinedFeed = [...combinedFeed, ...mappedActivities];
      }
    }

    if (combinedFeed.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    if (rawPosts && rawPosts.length < PAGE_SIZE) setHasMore(false);

    const enriched = await enrichPosts(combinedFeed, user.id, followSet);
    const ranked = rankPosts(enriched, followSet, user.id);

    setPosts(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newPosts = ranked.filter(p => !existingIds.has(p.id));
      return [...prev, ...newPosts];
    });
    setLoadingMore(false);
  }, [user, loadingMore, hasMore, activeTag, enrichPosts]);

  useEffect(() => { fetchPosts(activeTag); }, [fetchPosts, activeTag]);

  const filterByTag = (tag: string) => {
    setActiveTag(tag);
  };

  const clearTagFilter = () => {
    setActiveTag(null);
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: false, likes_count: p.likes_count - 1 } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: true, likes_count: p.likes_count + 1 } : p));
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_bookmarked) {
      await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: false } : p));
    } else {
      await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user.id });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_bookmarked: true } : p));
    }
  };

  const updateCommentCount = (postId: string, change: number) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count + change) } : p));
  };

  const createPost = async (content: string, imageFile: File | null, tags: string[], isWomenOnly = false) => {
    if (!user) return;
    const newPostId = crypto.randomUUID();
    let imageUrl: string | null = null;
    let location: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const filePath = `posts/${user.id}/${newPostId}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("social").upload(filePath, imageFile, { contentType: imageFile.type });
      if (!uploadError) {
        const { data: pbUrl } = supabase.storage.from("social").getPublicUrl(filePath);
        imageUrl = pbUrl.publicUrl;
      }
    }

    const { error } = await supabase.from("posts").insert({
      id: newPostId,
      user_id: user.id,
      content: content.trim() || null,
      image_url: imageUrl,
      location,
      tags,
      women_only: isWomenOnly
    });

    if (!error) {
      fetchPosts(activeTag);
    }
    return { error };
  };

  const updatePost = async (postId: string, content: string, tags: string[]) => {
    const { error } = await supabase.from("posts").update({ content: content.trim() || null, tags }).eq("id", postId);
    if (!error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: content.trim() || null, tags } : p));
    }
    return { error };
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
    return { error };
  };

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    activeTag,
    filterByTag,
    clearTagFilter,
    toggleLike,
    toggleBookmark,
    createPost,
    updatePost,
    deletePost,
    refetch: () => fetchPosts(activeTag),
    fetchMore: fetchMorePosts,
    updateCommentCount,
  };
}
