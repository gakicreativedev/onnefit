import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trainerId = claims.claims.sub as string;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user has 'professional' role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", trainerId)
      .single();

    if (roleData?.role !== "professional") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get trainer's students
    const { data: students } = await adminClient
      .from("trainer_students")
      .select("student_id, status")
      .eq("trainer_id", trainerId)
      .eq("status", "active");

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ students: [], workoutsByWeek: [], streaks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentIds = students.map((s) => s.student_id);

    // Fetch profiles (name, weight)
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, name, weight_kg, avatar_url")
      .in("user_id", studentIds);

    // Fetch streaks
    const { data: streaks } = await adminClient
      .from("user_streaks")
      .select("user_id, current_streak, longest_streak")
      .in("user_id", studentIds);

    // Fetch workout history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: workoutHistory } = await adminClient
      .from("workout_history")
      .select("user_id, completed_at, workout_name")
      .in("user_id", studentIds)
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .order("completed_at", { ascending: true });

    // Fetch user_activity (last 30 days)
    const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
    const { data: activities } = await adminClient
      .from("user_activity")
      .select("user_id, date, workout_completed, water_intake_ml")
      .in("user_id", studentIds)
      .gte("date", dateStr);

    // Aggregate workouts per week
    const weeklyMap = new Map<string, number>();
    (workoutHistory || []).forEach((w) => {
      const d = new Date(w.completed_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
      const key = weekStart.toISOString().split("T")[0];
      weeklyMap.set(key, (weeklyMap.get(key) || 0) + 1);
    });

    const workoutsByWeek = Array.from(weeklyMap.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Build student summaries
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const streakMap = new Map(streaks?.map((s) => [s.user_id, s]) || []);

    const studentSummaries = studentIds.map((id) => {
      const profile = profileMap.get(id);
      const streak = streakMap.get(id);
      const totalWorkouts = (workoutHistory || []).filter(
        (w) => w.user_id === id
      ).length;
      const activeDays = (activities || []).filter(
        (a) => a.user_id === id && a.workout_completed
      ).length;

      return {
        id,
        name: profile?.name || "Aluno",
        weight_kg: profile?.weight_kg || null,
        avatar_url: profile?.avatar_url || null,
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        workouts_30d: totalWorkouts,
        active_days_30d: activeDays,
      };
    });

    return new Response(
      JSON.stringify({
        students: studentSummaries,
        workoutsByWeek,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
