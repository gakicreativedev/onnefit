import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, differenceInCalendarDays } from "date-fns";

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export function useStreak(userId: string | undefined) {
  const [streak, setStreak] = useState<StreakData>({ current_streak: 0, longest_streak: 0, last_activity_date: null });
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setStreak({
        current_streak: data.current_streak,
        longest_streak: data.longest_streak,
        last_activity_date: data.last_activity_date,
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  const recordActivity = useCallback(async () => {
    if (!userId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    // Fetch current streak record
    const { data: existing } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!existing) {
      // Create first streak record
      await supabase.from("user_streaks").insert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      });
    } else {
      if (existing.last_activity_date === today) return; // Already recorded today

      let newStreak = 1;
      if (existing.last_activity_date === yesterday) {
        newStreak = existing.current_streak + 1;
      }
      const newLongest = Math.max(existing.longest_streak, newStreak);

      await supabase.from("user_streaks").update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    }

    await fetchStreak();
    return; // caller can check streak milestones
  }, [userId, fetchStreak]);

  return { streak, loading, recordActivity, refetch: fetchStreak };
}
