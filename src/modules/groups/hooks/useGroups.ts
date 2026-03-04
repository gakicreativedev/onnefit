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
  const [periodType, setPeriodType] = useState<"weekly" | "monthly" | "annual">("weekly");
  const [loading, setLoading] = useState(true);

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

  const calculateRankings = async () => {
    if (!groupId) return;
    toast.info("Calculando rankings...");
    await supabase.functions.invoke("group-rankings", { body: { group_id: groupId } });
    toast.success("Rankings atualizados!");
    fetchRankings();
  };

  return { group, members, rankings, periodType, setPeriodType, loading, calculateRankings, refetch: fetchDetail };
}
