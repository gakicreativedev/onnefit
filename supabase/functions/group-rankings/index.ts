import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth check ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { group_id } = await req.json();
    if (!group_id) throw new Error("group_id required");

    // Get group members
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", group_id);

    if (!members?.length) {
      return new Response(JSON.stringify({ message: "No members" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userIds = members.map((m: any) => m.user_id);
    const now = new Date();

    // Calculate periods
    const periods = [
      {
        type: "weekly",
        start: getWeekStart(now),
        end: getWeekEnd(now),
      },
      {
        type: "monthly",
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
      },
      {
        type: "annual",
        start: `${now.getFullYear()}-01-01`,
        end: `${now.getFullYear()}-12-31`,
      },
    ];

    for (const period of periods) {
      // Get activity data for all members in this period
      const { data: activities } = await supabase
        .from("user_activity")
        .select("user_id, date, workout_completed, water_intake_ml")
        .in("user_id", userIds)
        .gte("date", period.start)
        .lte("date", period.end);

      // Get meal plans (diet logged) for this period
      const { data: mealPlans } = await supabase
        .from("meal_plans")
        .select("user_id, date")
        .in("user_id", userIds)
        .gte("date", period.start)
        .lte("date", period.end);

      // Get streaks
      const { data: streaks } = await supabase
        .from("user_streaks")
        .select("user_id, current_streak, longest_streak")
        .in("user_id", userIds);

      const streakMap = new Map((streaks || []).map((s: any) => [s.user_id, s]));

      // Calculate scores for each user
      const scores = userIds.map((uid: string) => {
        const userActivities = (activities || []).filter((a: any) => a.user_id === uid);
        const daysTrained = userActivities.filter((a: any) => a.workout_completed).length;
        const waterGoalDays = userActivities.filter((a: any) => (a.water_intake_ml || 0) >= 2000).length;
        const dietDays = new Set((mealPlans || []).filter((m: any) => m.user_id === uid).map((m: any) => m.date)).size;
        const streak = streakMap.get(uid);
        const streakBest = streak ? Math.max(streak.current_streak, streak.longest_streak) : 0;

        // Scoring: 3pts per day trained, 2pts per diet day, 1pt per water goal day, 5pts per best streak day
        const totalScore = daysTrained * 3 + dietDays * 2 + waterGoalDays * 1 + streakBest * 5;

        return {
          group_id,
          user_id: uid,
          period_type: period.type,
          period_start: period.start,
          period_end: period.end,
          days_trained: daysTrained,
          days_diet_logged: dietDays,
          streak_best: streakBest,
          water_goal_days: waterGoalDays,
          total_score: totalScore,
          rank_position: 0,
          calculated_at: new Date().toISOString(),
        };
      });

      // Sort and assign ranks
      scores.sort((a, b) => b.total_score - a.total_score);
      scores.forEach((s, i) => (s.rank_position = i + 1));

      // Upsert rankings
      for (const score of scores) {
        await supabase
          .from("group_rankings")
          .upsert(score, { onConflict: "group_id,user_id,period_type,period_start" });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("group-rankings error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getWeekEnd(date: Date): string {
  const start = new Date(getWeekStart(date));
  start.setDate(start.getDate() + 6);
  return start.toISOString().split("T")[0];
}
