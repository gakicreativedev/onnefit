import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface XPEntry {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  created_at: string;
}

const XP_VALUES: Record<string, number> = {
  workout_completed: 50,
  diet_logged: 30,
  water_goal: 20,
  streak_bonus_3: 25,
  streak_bonus_7: 75,
  streak_bonus_30: 200,
};

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];

export function getLevel(totalXP: number) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 1000;
  const progress = ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return { level, totalXP, progress: Math.min(progress, 100), currentThreshold, nextThreshold };
}

export function useXP(userId: string | undefined) {
  const [totalXP, setTotalXP] = useState(0);
  const [history, setHistory] = useState<XPEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchXP = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("user_xp")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setHistory(data as XPEntry[]);
      setTotalXP(data.reduce((sum, e) => sum + e.amount, 0));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchXP(); }, [fetchXP]);

  const awardXP = useCallback(async (source: string, description?: string) => {
    if (!userId) return;
    const amount = XP_VALUES[source] || 10;
    await supabase.from("user_xp").insert({
      user_id: userId,
      amount,
      source,
      description: description || source,
    });
    await fetchXP();
  }, [userId, fetchXP]);

  return { totalXP, level: getLevel(totalXP), history, loading, awardXP, refetch: fetchXP };
}
