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

    const userId = claims.claims.sub as string;

    // Verify admin role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Total users
    const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const totalUsers = usersData?.users?.length || 0;

    // Active today (user_activity with today's date)
    const today = new Date().toISOString().split("T")[0];
    const { data: todayActivity } = await adminClient
      .from("user_activity")
      .select("id")
      .eq("date", today);
    const activeToday = todayActivity?.length || 0;

    // Active last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: weekActivity } = await adminClient
      .from("user_activity")
      .select("user_id")
      .gte("date", sevenDaysAgo.toISOString().split("T")[0]);
    const uniqueWeekUsers = new Set(weekActivity?.map((a) => a.user_id) || []);
    const activeWeek = uniqueWeekUsers.size;

    // Workouts completed today
    const { data: todayWorkouts } = await adminClient
      .from("user_activity")
      .select("id")
      .eq("date", today)
      .eq("workout_completed", true);
    const workoutsToday = todayWorkouts?.length || 0;

    // Total recipes
    const { data: recipes } = await adminClient.from("recipes").select("id");
    const totalRecipes = recipes?.length || 0;

    // Total workouts (global)
    const { data: workouts } = await adminClient.from("workouts").select("id");
    const totalWorkouts = workouts?.length || 0;

    // Total app updates
    const { data: updates } = await adminClient.from("app_updates").select("id");
    const totalUpdates = updates?.length || 0;

    // Onboarding completion rate
    const { data: profiles } = await adminClient.from("profiles").select("onboarding_completed");
    const onboardedCount = profiles?.filter((p) => p.onboarding_completed).length || 0;
    const onboardingRate = totalUsers > 0 ? Math.round((onboardedCount / totalUsers) * 100) : 0;

    // Workouts per day (last 7 days)
    const { data: weekWorkoutActivity } = await adminClient
      .from("user_activity")
      .select("date, workout_completed")
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .eq("workout_completed", true);

    const dailyMap = new Map<string, number>();
    (weekWorkoutActivity || []).forEach((a) => {
      dailyMap.set(a.date, (dailyMap.get(a.date) || 0) + 1);
    });
    const workoutsPerDay = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(
      JSON.stringify({
        totalUsers,
        activeToday,
        activeWeek,
        workoutsToday,
        totalRecipes,
        totalWorkouts,
        totalUpdates,
        onboardingRate,
        workoutsPerDay,
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
