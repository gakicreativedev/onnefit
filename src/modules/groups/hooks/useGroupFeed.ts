import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────
export interface ScoreRules {
    type: "per_workout" | "distance_km" | "duration_min" | "calories" | "steps" | "custom";
    value?: number; // points per unit (e.g. 1 point per workout, 1 point per km)
    rules?: { label: string; points: number }[]; // for custom type
}

export interface GroupActivity {
    id: string;
    group_id: string;
    user_id: string;
    title: string;
    photo_url: string;
    description: string | null;
    distance_km: number | null;
    duration_min: number | null;
    calories: number | null;
    steps: number | null;
    custom_rule_label: string | null;
    points_awarded: number;
    created_at: string;
    // Enriched
    author: {
        name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
    reactions: Record<string, string[]>; // emoji → [userName, ...]
    my_reactions: string[]; // emojis I reacted with
    comments_count: number;
}

export interface ActivityComment {
    id: string;
    activity_id: string;
    user_id: string;
    content: string;
    created_at: string;
    author: {
        name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
}

const AVAILABLE_EMOJIS = ["🔥", "💪", "👏", "❤️", "🏆"];
const PAGE_SIZE = 15;

// ─── Calculate Points ────────────────────────────────────
export function calculatePoints(
    rules: ScoreRules,
    data: { distance_km?: number; duration_min?: number; calories?: number; steps?: number; custom_rule_label?: string }
): number {
    switch (rules.type) {
        case "per_workout":
            return rules.value ?? 1;
        case "distance_km":
            return (data.distance_km ?? 0) * (rules.value ?? 1);
        case "duration_min":
            return (data.duration_min ?? 0) * (rules.value ?? 1);
        case "calories":
            return (data.calories ?? 0) * (rules.value ?? 0.01);
        case "steps":
            return (data.steps ?? 0) * (rules.value ?? 0.001);
        case "custom": {
            if (!rules.rules || !data.custom_rule_label) return 0;
            const found = rules.rules.find(r => r.label === data.custom_rule_label);
            return found?.points ?? 0;
        }
        default:
            return 1;
    }
}

// ─── Hook ────────────────────────────────────────────────
export function useGroupFeed(groupId: string | undefined) {
    const { user } = useAuth();
    const [activities, setActivities] = useState<GroupActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    // ── Enrich raw activities with profiles, reactions, comments count ──
    const enrichActivities = useCallback(async (raw: any[]): Promise<GroupActivity[]> => {
        if (!raw.length || !user) return [];

        const activityIds = raw.map(a => a.id);
        const userIds = [...new Set(raw.map(a => a.user_id))];

        const [profilesRes, reactionsRes, myReactionsRes, commentsCountRes] = await Promise.all([
            supabase.from("profiles").select("user_id, name, username, avatar_url").in("user_id", userIds),
            supabase.from("activity_reactions").select("activity_id, emoji, user_id").in("activity_id", activityIds),
            supabase.from("activity_reactions").select("activity_id, emoji").eq("user_id", user.id).in("activity_id", activityIds),
            supabase.from("activity_comments").select("activity_id").in("activity_id", activityIds),
        ]);

        const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));

        // Get names for reactors
        const reactorIds = [...new Set((reactionsRes.data || []).map(r => r.user_id))];
        const { data: reactorProfiles } = reactorIds.length > 0
            ? await supabase.from("profiles").select("user_id, name").in("user_id", reactorIds)
            : { data: [] };
        const reactorNameMap = new Map((reactorProfiles || []).map(p => [p.user_id, p.name || "Usuário"]));

        // Build reactions map per activity
        const reactionsMap = new Map<string, Record<string, string[]>>();
        (reactionsRes.data || []).forEach(r => {
            const key = r.activity_id;
            if (!reactionsMap.has(key)) reactionsMap.set(key, {});
            const map = reactionsMap.get(key)!;
            if (!map[r.emoji]) map[r.emoji] = [];
            const name = reactorNameMap.get(r.user_id) || "Usuário";
            if (!map[r.emoji].includes(name)) map[r.emoji].push(name);
        });

        // My reactions per activity
        const myReactionsMap = new Map<string, string[]>();
        (myReactionsRes.data || []).forEach(r => {
            const arr = myReactionsMap.get(r.activity_id) || [];
            arr.push(r.emoji);
            myReactionsMap.set(r.activity_id, arr);
        });

        // Comments count per activity
        const commentsCountMap = new Map<string, number>();
        (commentsCountRes.data || []).forEach(c => {
            commentsCountMap.set(c.activity_id, (commentsCountMap.get(c.activity_id) || 0) + 1);
        });

        return raw.map(a => {
            const profile = profileMap.get(a.user_id);
            return {
                ...a,
                author: {
                    name: profile?.name || "Usuário",
                    username: profile?.username || null,
                    avatar_url: profile?.avatar_url || null,
                },
                reactions: reactionsMap.get(a.id) || {},
                my_reactions: myReactionsMap.get(a.id) || [],
                comments_count: commentsCountMap.get(a.id) || 0,
            };
        });
    }, [user]);

    // ── Fetch Activities ──
    const fetchActivities = useCallback(async () => {
        if (!groupId || !user) return;
        setLoading(true);
        setPage(0);
        setHasMore(true);

        const { data: raw } = await supabase
            .from("group_activities")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })
            .range(0, PAGE_SIZE - 1);

        if (!raw || raw.length === 0) {
            setActivities([]);
            setHasMore(false);
            setLoading(false);
            return;
        }

        if (raw.length < PAGE_SIZE) setHasMore(false);
        const enriched = await enrichActivities(raw);
        setActivities(enriched);
        setLoading(false);
    }, [groupId, user, enrichActivities]);

    // ── Fetch More ──
    const fetchMore = useCallback(async () => {
        if (!groupId || !user || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const nextPage = page + 1;
        const from = nextPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data: raw } = await supabase
            .from("group_activities")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })
            .range(from, to);

        if (!raw || raw.length === 0) {
            setHasMore(false);
            setLoadingMore(false);
            return;
        }

        if (raw.length < PAGE_SIZE) setHasMore(false);
        const enriched = await enrichActivities(raw);
        setActivities(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            return [...prev, ...enriched.filter(a => !existingIds.has(a.id))];
        });
        setPage(nextPage);
        setLoadingMore(false);
    }, [groupId, user, page, loadingMore, hasMore, enrichActivities]);

    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    // ── Submit Activity ──
    const submitActivity = async (data: {
        title: string;
        photoFile: File;
        description?: string;
        distance_km?: number;
        duration_min?: number;
        calories?: number;
        steps?: number;
        custom_rule_label?: string;
        scoreRules: ScoreRules;
    }) => {
        if (!user || !groupId) return;

        // Upload photo
        const ext = data.photoFile.name.split(".").pop() || "jpg";
        const path = `groups/${groupId}/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("social").upload(path, data.photoFile, { contentType: data.photoFile.type });
        if (uploadError) { toast.error("Erro ao enviar foto"); return; }
        const { data: urlData } = supabase.storage.from("social").getPublicUrl(path);

        const points = calculatePoints(data.scoreRules, {
            distance_km: data.distance_km,
            duration_min: data.duration_min,
            calories: data.calories,
            steps: data.steps,
            custom_rule_label: data.custom_rule_label,
        });

        const { error } = await supabase.from("group_activities").insert({
            group_id: groupId,
            user_id: user.id,
            title: data.title,
            photo_url: urlData.publicUrl,
            description: data.description || null,
            distance_km: data.distance_km || null,
            duration_min: data.duration_min || null,
            calories: data.calories || null,
            steps: data.steps || null,
            custom_rule_label: data.custom_rule_label || null,
            points_awarded: points,
        });

        if (error) { toast.error("Erro ao registrar atividade"); return; }
        toast.success(`+${points.toFixed(1)} pts! Atividade registrada 🎉`);
        fetchActivities();
    };

    // ── Toggle Reaction ──
    const toggleReaction = async (activityId: string, emoji: string) => {
        if (!user) return;
        const activity = activities.find(a => a.id === activityId);
        if (!activity) return;

        const hasReacted = activity.my_reactions.includes(emoji);

        if (hasReacted) {
            await supabase.from("activity_reactions").delete()
                .eq("activity_id", activityId)
                .eq("user_id", user.id)
                .eq("emoji", emoji);
        } else {
            await supabase.from("activity_reactions").insert({
                activity_id: activityId,
                user_id: user.id,
                emoji,
            });
        }

        // Optimistic update
        setActivities(prev => prev.map(a => {
            if (a.id !== activityId) return a;
            const myReactions = hasReacted
                ? a.my_reactions.filter(e => e !== emoji)
                : [...a.my_reactions, emoji];
            const reactions = { ...a.reactions };
            const userName = "Você";
            if (hasReacted) {
                if (reactions[emoji]) {
                    reactions[emoji] = reactions[emoji].filter(n => n !== userName);
                    if (reactions[emoji].length === 0) delete reactions[emoji];
                }
            } else {
                reactions[emoji] = [...(reactions[emoji] || []), userName];
            }
            return { ...a, my_reactions: myReactions, reactions };
        }));
    };

    // ── Comments ──
    const fetchComments = async (activityId: string): Promise<ActivityComment[]> => {
        const { data: raw } = await supabase
            .from("activity_comments")
            .select("*")
            .eq("activity_id", activityId)
            .order("created_at", { ascending: true });

        if (!raw || raw.length === 0) return [];

        const userIds = [...new Set(raw.map(c => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, username, avatar_url").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        return raw.map(c => {
            const profile = profileMap.get(c.user_id);
            return {
                ...c,
                author: {
                    name: profile?.name || "Usuário",
                    username: profile?.username || null,
                    avatar_url: profile?.avatar_url || null,
                },
            };
        });
    };

    const addComment = async (activityId: string, content: string) => {
        if (!user) return;
        const { error } = await supabase.from("activity_comments").insert({
            activity_id: activityId,
            user_id: user.id,
            content,
        });
        if (error) { toast.error("Erro ao comentar"); return; }

        // Update count
        setActivities(prev => prev.map(a =>
            a.id === activityId ? { ...a, comments_count: a.comments_count + 1 } : a
        ));
    };

    const deleteComment = async (commentId: string, activityId: string) => {
        if (!user) return;
        await supabase.from("activity_comments").delete().eq("id", commentId).eq("user_id", user.id);
        setActivities(prev => prev.map(a =>
            a.id === activityId ? { ...a, comments_count: Math.max(0, a.comments_count - 1) } : a
        ));
    };

    // ── Delete Activity ──
    const deleteActivity = async (activityId: string) => {
        if (!user) return;
        await supabase.from("group_activities").delete().eq("id", activityId).eq("user_id", user.id);
        setActivities(prev => prev.filter(a => a.id !== activityId));
        toast.success("Atividade removida");
    };

    return {
        activities,
        loading,
        loadingMore,
        hasMore,
        submitActivity,
        toggleReaction,
        fetchComments,
        addComment,
        deleteComment,
        deleteActivity,
        fetchMore,
        refetch: fetchActivities,
        AVAILABLE_EMOJIS,
    };
}

// ─── Leaderboard Hook ────────────────────────────────────
export interface LeaderboardEntry {
    user_id: string;
    name: string | null;
    username: string | null;
    avatar_url: string | null;
    total_points: number;
    activity_count: number;
}

export function useLeaderboard(groupId: string | undefined) {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"daily" | "weekly" | "monthly" | "total">("weekly");

    const fetchLeaderboard = useCallback(async () => {
        if (!groupId || !user) return;
        setLoading(true);

        // Determine date range
        const now = new Date();
        let dateFrom: string | null = null;

        if (filter === "daily") {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (filter === "weekly") {
            const day = now.getDay();
            const diff = (day === 0 ? 6 : day - 1); // Monday as start
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            monday.setHours(0, 0, 0, 0);
            dateFrom = monday.toISOString();
        } else if (filter === "monthly") {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        }
        // total = null (no filter)

        let query = supabase
            .from("group_activities")
            .select("user_id, points_awarded")
            .eq("group_id", groupId);

        if (dateFrom) {
            query = query.gte("created_at", dateFrom);
        }

        const { data: activities } = await query;

        if (!activities || activities.length === 0) {
            setEntries([]);
            setLoading(false);
            return;
        }

        // Aggregate by user
        const userMap = new Map<string, { total_points: number; activity_count: number }>();
        activities.forEach(a => {
            const existing = userMap.get(a.user_id) || { total_points: 0, activity_count: 0 };
            existing.total_points += a.points_awarded || 0;
            existing.activity_count += 1;
            userMap.set(a.user_id, existing);
        });

        const userIds = [...userMap.keys()];
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, name, username, avatar_url")
            .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        const sorted: LeaderboardEntry[] = userIds
            .map(uid => {
                const stats = userMap.get(uid)!;
                const profile = profileMap.get(uid);
                return {
                    user_id: uid,
                    name: profile?.name || "Usuário",
                    username: profile?.username || null,
                    avatar_url: profile?.avatar_url || null,
                    total_points: Math.round(stats.total_points * 10) / 10,
                    activity_count: stats.activity_count,
                };
            })
            .sort((a, b) => b.total_points - a.total_points);

        setEntries(sorted);
        setLoading(false);
    }, [groupId, user, filter]);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    return { entries, loading, filter, setFilter, refetch: fetchLeaderboard };
}
