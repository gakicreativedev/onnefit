import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useXP } from "@/modules/gamification/hooks/useXP";
import { useStreak } from "@/modules/gamification/hooks/useStreak";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { DailyWorkoutCard } from "../components/DailyWorkoutCard";
import { WeeklySequenceCard } from "../components/WeeklySequenceCard";
import { CommunityHighlightsCard } from "../components/CommunityHighlightsCard";
import { DailyNutritionCard } from "../components/DailyNutritionCard";
import { startOfWeek, addDays, format } from "date-fns";
import { BoltBold, FireBold } from "solar-icon-set";

interface DashboardPageProps {
  profile: Profile;
}

const DAY_LABELS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const MEAL_TIMES = [
  { key: "breakfast", label: "Café da Manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
];

interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function DashboardPage({ profile }: DashboardPageProps) {
  const { user } = useAuth();
  const { totalXP, level, awardXP } = useXP(user?.id);
  const { streak, recordActivity } = useStreak(user?.id);
  const [workoutName, setWorkoutName] = useState("TREINO\nDO DIA");
  const [weekDays, setWeekDays] = useState(DAY_LABELS.map((label) => ({ label, trained: false })));
  const [waterIntake, setWaterIntake] = useState(0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [todayMealPlanId, setTodayMealPlanId] = useState<string | null>(null);
  const [mealSlots, setMealSlots] = useState(MEAL_TIMES.map((m) => ({ ...m, items: [] as FoodItem[] })));

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchAll = useCallback(async () => {
    if (!user) return;

    // Workout name
    const { data: workouts } = await supabase.from("workouts").select("name").limit(1);
    if (workouts?.[0]) setWorkoutName(workouts[0].name.toUpperCase());

    // Weekly activity + workout history cross-reference
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
    const [{ data: activities }, { data: historyEntries }] = await Promise.all([
      supabase
        .from("user_activity")
        .select("date, workout_completed, water_intake_ml")
        .eq("user_id", user.id)
        .gte("date", weekDates[0])
        .lte("date", weekDates[6]),
      supabase
        .from("workout_history")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", `${weekDates[0]}T00:00:00`)
        .lte("completed_at", `${weekDates[6]}T23:59:59`),
    ]);

    const activityMap = new Map(activities?.map((a) => [a.date, a]) || []);
    const historyDates = new Set(historyEntries?.map((h) => format(new Date(h.completed_at), "yyyy-MM-dd")) || []);
    setWeekDays(DAY_LABELS.map((label, i) => ({
      label,
      trained: activityMap.get(weekDates[i])?.workout_completed || historyDates.has(weekDates[i]),
    })));

    const todayActivity = activityMap.get(today);
    setWaterIntake(todayActivity?.water_intake_ml || 0);
    setWorkoutCompleted(todayActivity?.workout_completed || false);

    // Today's meals grouped by meal_time
    const { data: mealPlans } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .limit(1);

    if (mealPlans?.[0]) {
      setTodayMealPlanId(mealPlans[0].id);
      const { data: meals } = await supabase
        .from("meals")
        .select("id, name, meal_time, calories, protein, carbs, fat")
        .eq("meal_plan_id", mealPlans[0].id);

      setMealSlots(MEAL_TIMES.map((slot) => ({
        ...slot,
        items: (meals || [])
          .filter((m) => m.meal_time === slot.key)
          .map((m) => ({
            id: m.id,
            name: m.name,
            quantity: "",
            calories: m.calories || 0,
            protein: m.protein || 0,
            carbs: m.carbs || 0,
            fat: m.fat || 0,
          })),
      })));
    } else {
      setTodayMealPlanId(null);
      setMealSlots(MEAL_TIMES.map((m) => ({ ...m, items: [] })));
    }
  }, [user, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ensureTodayActivity = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_activity")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .limit(1);
    if (!data?.length) {
      await supabase.from("user_activity").insert({ user_id: user.id, date: today });
    }
  };

  const handleMarkWorkoutDone = async () => {
    if (!user) return;
    await ensureTodayActivity();
    await supabase.from("user_activity").update({ workout_completed: true }).eq("user_id", user.id).eq("date", today);
    setWorkoutCompleted(true);
    // Award XP and update streak
    await awardXP("workout_completed", "Treino do dia concluído");
    await recordActivity();
    fetchAll();
  };

  const handleAddWater = async (ml: number) => {
    if (!user) return;
    await ensureTodayActivity();
    const newIntake = waterIntake + ml;
    await supabase.from("user_activity").update({ water_intake_ml: newIntake }).eq("user_id", user.id).eq("date", today);
    setWaterIntake(newIntake);
  };

  const ensureMealPlan = async (): Promise<string | null> => {
    if (!user) return null;
    if (todayMealPlanId) return todayMealPlanId;
    const { data } = await supabase
      .from("meal_plans")
      .insert({ user_id: user.id, date: today })
      .select("id")
      .single();
    if (data) {
      setTodayMealPlanId(data.id);
      return data.id;
    }
    return null;
  };

  const handleAddFood = async (
    mealTime: string,
    food: { name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }
  ) => {
    const planId = await ensureMealPlan();
    if (!planId) return;
    const displayName = food.quantity ? `${food.name} (${food.quantity})` : food.name;
    await supabase.from("meals").insert({
      meal_plan_id: planId,
      name: displayName,
      meal_time: mealTime,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    fetchAll();
  };

  const handleDeleteFood = async (foodId: string) => {
    await supabase.from("meals").delete().eq("id", foodId);
    fetchAll();
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
  };

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-5 max-w-5xl mx-auto w-full"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Saudação personalizada + XP/Streak */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            Olá, <span className="text-primary">{profile.name || "atleta"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"}! Vamos treinar hoje?
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5">
            <BoltBold size={18} color="currentColor" className="text-primary" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground leading-none">Nível {level.level}</span>
              <span className="text-sm font-black text-foreground leading-tight">{totalXP} XP</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5">
            <FireBold size={18} color="currentColor" className="text-orange-500" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground leading-none">Streak</span>
              <span className="text-sm font-black text-foreground leading-tight">{streak.current_streak} dias</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 1. SEQUÊNCIA — always full width */}
      <motion.div variants={fadeUp}>
        <WeeklySequenceCard days={weekDays} />
      </motion.div>

      {/* 2 & 3. TREINO + DIETA — side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <DailyWorkoutCard
            workoutName={workoutName}
            workoutCompleted={workoutCompleted}
            onStartWorkout={handleMarkWorkoutDone}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2">
          <DailyNutritionCard
            profile={profile}
            mealSlots={mealSlots}
            waterIntakeMl={waterIntake}
            onAddWater={handleAddWater}
            onAddFood={handleAddFood}
            onDeleteFood={handleDeleteFood}
          />
        </motion.div>
      </div>

      {/* 4. COMUNIDADE — always full width */}
      <motion.div variants={fadeUp}>
        <CommunityHighlightsCard />
      </motion.div>
    </motion.div>
  );
}
