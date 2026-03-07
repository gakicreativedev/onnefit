import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";

import { type ScoreRules } from "./useGroupFeed";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  invite_code: string;
  created_by: string;
  max_members: number | null;
  created_at: string;
  group_type: "club" | "challenge";
  start_date: string | null;
  end_date: string | null;
  start_of_week: number;
  score_rules: ScoreRules;
  member_count?: number;
  is_member?: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { name: string | null; username: string | null; avatar_url: string | null };
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface GroupRanking {
  id: string;
  group_id: string;
  user_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  days_trained: number;
  days_diet_logged: number;
  streak_best: number;
  water_goal_days: number;
  total_score: number;
  rank_position: number;
  calculated_at: string;
  profile?: { name: string | null; username: string | null; avatar_url: string | null };
}

export interface GroupGoal {
  id: string;
  group_id: string;
  title: string;
  target_value: number;
  metric_type: string;
  deadline: string | null;
  created_at: string;
  created_by: string;
  current_value?: number; // Calculated on client
}

export interface GroupResource {
  id: string;
  group_id: string;
  title: string;
  url: string | null;
  description: string | null;
  created_at: string;
  created_by: string;
}

export function useGroups() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // My groups (where I'm a member)
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    const myGroupIds = (memberships || []).map((m: any) => m.group_id);

    if (myGroupIds.length > 0) {
      const { data } = await supabase.from("groups").select("*").in("id", myGroupIds);
      // Get member counts
      const withCounts = await Promise.all(
        (data || []).map(async (g: any) => {
          const { count } = await supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", g.id);
          return { ...g, member_count: count || 0, is_member: true };
        })
      );
      setMyGroups(withCounts);
    } else {
      setMyGroups([]);
    }

    // Public groups (not already member)
    const { data: pub } = await supabase.from("groups").select("*").eq("is_public", true);
    const publicFiltered = (pub || []).filter((g: any) => !myGroupIds.includes(g.id));
    const withCounts = await Promise.all(
      publicFiltered.map(async (g: any) => {
        const { count } = await supabase.from("group_members").select("id", { count: "exact", head: true }).eq("group_id", g.id);
        return { ...g, member_count: count || 0, is_member: false };
      })
    );
    setPublicGroups(withCounts);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = async (data: {
    name: string;
    description?: string;
    is_public: boolean;
    group_type?: "club" | "challenge";
    start_date?: string;
    end_date?: string;
    score_rules?: ScoreRules;
  }) => {
    if (!user) return;

    // Try with all new fields first
    let result = await supabase
      .from("groups")
      .insert({
        name: data.name,
        description: data.description || null,
        is_public: data.is_public,
        created_by: user.id,
        group_type: data.group_type || "club",
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        score_rules: data.score_rules || { type: "per_workout", value: 1 },
      } as any)
      .select()
      .single();

    // Fallback: if new columns don't exist yet, insert with original fields only
    if (result.error) {
      console.warn("Tentando criar grupo sem campos novos (migration pendente):", result.error.message);
      result = await supabase
        .from("groups")
        .insert({
          name: data.name,
          description: data.description || null,
          is_public: data.is_public,
          created_by: user.id,
        })
        .select()
        .single();
    }

    if (result.error) { toast.error("Erro ao criar grupo: " + result.error.message); return; }
    const group = result.data;
    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "admin" });
    toast.success("Grupo criado!");
    fetchGroups();
    return group;
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    if (error) { toast.error(error.message.includes("duplicate") ? "Você já é membro" : "Erro ao entrar"); return; }
    toast.success("Você entrou no grupo!");
    fetchGroups();
  };

  const joinByCode = async (code: string) => {
    if (!user) return;
    const { data: group } = await supabase.from("groups").select("id").eq("invite_code", code.trim()).single();
    if (!group) { toast.error("Código inválido"); return; }
    await joinGroup(group.id);
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    toast.success("Você saiu do grupo");
    fetchGroups();
  };

  const deleteGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("groups").delete().eq("id", groupId);
    toast.success("Grupo excluído");
    fetchGroups();
  };

  const inviteUser = async (groupId: string, username: string) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("username", username.replace("@", "")).single();
    if (!profile) { toast.error("Usuário não encontrado"); return; }
    const { error } = await supabase.from("group_invites").insert({
      group_id: groupId,
      invited_user_id: profile.user_id,
      invited_by: user.id,
    });
    if (error) { toast.error(error.message.includes("duplicate") ? "Já convidado" : "Erro ao convidar"); return; }

    const { data: g } = await supabase.from("groups").select("name").eq("id", groupId).single();
    if (g) {
      await supabase.from("notifications").insert({
        user_id: profile.user_id,
        actor_id: user.id,
        type: "group_invite",
        post_id: null,
        content: g.name,
      });
    }

    toast.success(`@${username.replace("@", "")} convidado!`);
  };

  const updateGroupSettings = async (groupId: string, settings: Partial<Pick<Group, "name" | "description" | "group_type" | "start_date" | "end_date" | "start_of_week" | "score_rules" | "is_public">>) => {
    if (!user) return;
    const { error } = await supabase.from("groups").update(settings).eq("id", groupId);
    if (error) { toast.error("Erro ao atualizar configurações"); return; }
    toast.success("Configurações atualizadas!");
    fetchGroups();
  };

  const transferAdmin = async (groupId: string, newAdminUserId: string) => {
    if (!user) return;
    // Remove current admin role, set new one
    await supabase.from("group_members").update({ role: "member" }).eq("group_id", groupId).eq("user_id", user.id);
    await supabase.from("group_members").update({ role: "admin" }).eq("group_id", groupId).eq("user_id", newAdminUserId);
    await supabase.from("groups").update({ created_by: newAdminUserId }).eq("id", groupId);
    toast.success("Admin transferido!");
    fetchGroups();
  };

  return { myGroups, publicGroups, loading, createGroup, joinGroup, joinByCode, leaveGroup, deleteGroup, inviteUser, updateGroupSettings, transferAdmin, refetch: fetchGroups };
}

export function useGroupDetail(groupId: string | undefined) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [rankings, setRankings] = useState<GroupRanking[]>([]);
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [periodType, setPeriodType] = useState<"weekly" | "monthly" | "annual">("weekly");
  const [loading, setLoading] = useState(true);
  const [challengeClosed, setChallengeClosed] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!groupId || !user) return;
    setLoading(true);

    const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).single();
    if (g) setGroup(g as Group);

    // Members with profiles
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    if (mems?.length) {
      const userIds = mems.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, username, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setMembers(mems.map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) })));
    }

    // Fetch goals and resources
    // @ts-ignore
    const { data: goalsData } = await (supabase as any).from("group_goals").select("*").eq("group_id", groupId);
    // @ts-ignore
    const { data: resourcesData } = await (supabase as any).from("group_resources").select("*").eq("group_id", groupId);

    // Fetch activities to calc goal progress
    let activities: any[] = [];
    if (goalsData?.length) {
      // @ts-ignore
      const { data: acts } = await (supabase as any).from("group_activities").select("distance_km, duration_min, calories, steps").eq("group_id", groupId);
      activities = acts || [];
    }

    const calculatedGoals = (goalsData || []).map((g: any) => {
      let sum = 0;
      activities.forEach(a => {
        if (g.metric_type === "distance_km") sum += (a.distance_km || 0);
        else if (g.metric_type === "duration_min") sum += (a.duration_min || 0);
        else if (g.metric_type === "calories") sum += (a.calories || 0);
        else if (g.metric_type === "steps") sum += (a.steps || 0);
      });
      return { ...g, current_value: sum };
    });

    setGoals(calculatedGoals);
    setResources(resourcesData || []);

    setLoading(false);
  }, [groupId, user]);

  const fetchRankings = useCallback(async () => {
    if (!groupId || !user) return;

    const { data: ranks } = await supabase
      .from("group_rankings")
      .select("*")
      .eq("group_id", groupId)
      .eq("period_type", periodType)
      .order("rank_position", { ascending: true });

    if (ranks?.length) {
      const userIds = ranks.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, username, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setRankings(ranks.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) })));
    } else {
      setRankings([]);
    }
  }, [groupId, user, periodType]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  const checkChallengeClosed = useCallback(async () => {
    if (!groupId) return;
    // @ts-ignore
    const { count } = await (supabase as any)
      .from("user_badges")
      .select("*", { count: 'exact', head: true })
      .contains("metadata", { group_id: groupId });
    setChallengeClosed((count || 0) > 0);
  }, [groupId]);

  useEffect(() => { checkChallengeClosed(); }, [checkChallengeClosed]);

  const closeChallenge = async (topUsers: { user_id: string; total_points: number }[]) => {
    if (!groupId || !group) return;
    const top3 = topUsers.slice(0, 3);
    if (top3.length === 0) {
      toast.error("Nenhum participante com pontos no placar.");
      return;
    }

    const badgesToInsert = top3.map((u, index) => {
      let badgeName = "";
      let emoji = "";
      if (index === 0) { badgeName = `Campeão: ${group.name}`; emoji = "🏆"; }
      else if (index === 1) { badgeName = `2º Lugar: ${group.name}`; emoji = "🥈"; }
      else { badgeName = `3º Lugar: ${group.name}`; emoji = "🥉"; }

      return {
        user_id: u.user_id,
        badge_type: "challenge_winner",
        badge_name: badgeName,
        badge_icon: emoji,
        metadata: { group_id: groupId, points: u.total_points, rank: index + 1 }
      };
    });

    // @ts-ignore
    const { error } = await (supabase as any).from("user_badges").insert(badgesToInsert);
    if (error) {
      toast.error("Erro ao encerrar desafio: " + error.message);
      return;
    }

    const notifs = top3.map(u => ({
      user_id: u.user_id,
      actor_id: user?.id || group.created_by,
      type: "challenge_winner",
      post_id: null,
      content: group.name,
    }));
    if (notifs.length > 0) {
      await supabase.from("notifications").insert(notifs);
    }

    toast.success("Desafio encerrado! Prêmios distribuídos aos 3 melhores.");
    setChallengeClosed(true);
  };


  const calculateRankings = async () => {
    if (!groupId) return;
    toast.info("Calculando rankings...");
    await supabase.functions.invoke("group-rankings", { body: { group_id: groupId } });
    toast.success("Rankings atualizados!");
    fetchRankings();
  };

  const createGoal = async (goalData: Partial<GroupGoal>) => {
    // @ts-ignore
    const { error } = await (supabase as any).from("group_goals").insert({ ...goalData, group_id: groupId, created_by: user?.id });
    if (error) throw error;
    fetchDetail();
  };

  const deleteGoal = async (id: string) => {
    // @ts-ignore
    const { error } = await (supabase as any).from("group_goals").delete().eq("id", id);
    if (error) throw error;
    fetchDetail();
  };

  const createResource = async (resData: Partial<GroupResource>) => {
    // @ts-ignore
    const { error } = await (supabase as any).from("group_resources").insert({ ...resData, group_id: groupId, created_by: user?.id });
    if (error) throw error;
    fetchDetail();
  };

  const deleteResource = async (id: string) => {
    // @ts-ignore
    const { error } = await (supabase as any).from("group_resources").delete().eq("id", id);
    if (error) throw error;
    fetchDetail();
  };

  return { group, members, rankings, goals, resources, periodType, setPeriodType, loading, calculateRankings, refetch: fetchDetail, challengeClosed, closeChallenge, createGoal, deleteGoal, createResource, deleteResource };
}
