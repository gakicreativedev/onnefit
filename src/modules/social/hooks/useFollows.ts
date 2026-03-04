import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface FollowUser {
  user_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_following: boolean;
  is_verified: boolean;
  is_private?: boolean;
  follow_status?: string; // 'accepted' | 'pending' | null
}

export function useFollows() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followStatusMap, setFollowStatusMap] = useState<Map<string, string>>(new Map());
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollows = useCallback(async () => {
    if (!user) return;

    const [followingRes, followersRes, pendingRes] = await Promise.all([
      supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
      supabase.from("follows").select("follower_id").eq("following_id", user.id).eq("status", "accepted"),
      supabase.from("follows").select("id, follower_id, created_at").eq("following_id", user.id).eq("status", "pending"),
    ]);

    const allFollowing = followingRes.data || [];
    const acceptedIds = new Set(allFollowing.filter(f => f.status === "accepted").map(f => f.following_id));
    const statusMap = new Map(allFollowing.map(f => [f.following_id, f.status]));
    
    setFollowingIds(acceptedIds);
    setFollowStatusMap(statusMap);
    setFollowingCount(acceptedIds.size);
    setFollowersCount((followersRes.data || []).length);

    // Enrich pending requests with profile info
    const pendingData = pendingRes.data || [];
    if (pendingData.length > 0) {
      const pendingUserIds = pendingData.map(p => p.follower_id);
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, name, username, avatar_url")
        .in("user_id", pendingUserIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      setPendingRequests(pendingData.map(p => ({
        ...p,
        profile: profileMap.get(p.follower_id) || { name: "Usuário", username: null, avatar_url: null },
      })));
    } else {
      setPendingRequests([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFollows(); }, [fetchFollows]);

  const toggleFollow = async (targetUserId: string, targetIsPrivate?: boolean) => {
    if (!user || targetUserId === user.id) return;

    const currentStatus = followStatusMap.get(targetUserId);

    if (currentStatus === "accepted" || currentStatus === "pending") {
      // Unfollow or cancel request
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      setFollowingIds(prev => { const next = new Set(prev); next.delete(targetUserId); return next; });
      setFollowStatusMap(prev => { const next = new Map(prev); next.delete(targetUserId); return next; });
      if (currentStatus === "accepted") setFollowingCount(c => c - 1);
    } else {
      // New follow
      const status = targetIsPrivate ? "pending" : "accepted";
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId, status });
      
      if (status === "accepted") {
        setFollowingIds(prev => new Set(prev).add(targetUserId));
        setFollowingCount(c => c + 1);
      }
      setFollowStatusMap(prev => new Map(prev).set(targetUserId, status));

      // Send notification for follow request
      if (status === "pending") {
        await supabase.from("notifications").insert({
          user_id: targetUserId,
          actor_id: user.id,
          type: "follow_request",
          content: null,
          post_id: null,
        });
      }
    }
  };

  const acceptFollowRequest = async (followId: string, followerId: string) => {
    if (!user) return;
    await supabase.from("follows").update({ status: "accepted" }).eq("id", followId);
    setPendingRequests(prev => prev.filter(p => p.id !== followId));
    setFollowersCount(c => c + 1);

    // Notify the requester
    await supabase.from("notifications").insert({
      user_id: followerId,
      actor_id: user.id,
      type: "follow_accepted",
      content: null,
      post_id: null,
    });
  };

  const rejectFollowRequest = async (followId: string) => {
    await supabase.from("follows").delete().eq("id", followId);
    setPendingRequests(prev => prev.filter(p => p.id !== followId));
  };

  const isFollowing = (userId: string) => followingIds.has(userId);
  const getFollowStatus = (userId: string) => followStatusMap.get(userId) || null;

  const isMutualFollower = useCallback((userId: string) => {
    // This is a simplified client-side check. For accuracy, use the DB function.
    return followingIds.has(userId);
  }, [followingIds]);

  // Discover users the current user doesn't follow yet
  const discoverUsers = useCallback(async (): Promise<FollowUser[]> => {
    if (!user) return [];

    const { data: allProfiles } = await supabase
      .from("public_profiles")
      .select("user_id, name, username, avatar_url, is_verified, is_private")
      .neq("user_id", user.id)
      .limit(50);

    return (allProfiles || []).map(p => ({
      ...p,
      is_following: followingIds.has(p.user_id!),
      is_verified: p.is_verified || false,
      is_private: p.is_private || false,
      follow_status: followStatusMap.get(p.user_id!) || null,
    })) as FollowUser[];
  }, [user, followingIds, followStatusMap]);

  return {
    followingIds,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
    isFollowing,
    getFollowStatus,
    isMutualFollower,
    discoverUsers,
    pendingRequests,
    acceptFollowRequest,
    rejectFollowRequest,
    refetch: fetchFollows,
  };
}
