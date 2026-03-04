import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import type { FoodItem, MealSlot, SearchFood } from "@/lib/types";
import { MEAL_TIMES } from "@/lib/types";

export function useDietTracker() {
    const { user } = useAuth();
    const [todayMealPlanId, setTodayMealPlanId] = useState<string | null>(null);
    const [mealSlots, setMealSlots] = useState<MealSlot[]>(MEAL_TIMES.map((m) => ({ ...m, items: [] })));
    const [waterIntake, setWaterIntake] = useState(0);
    const [searchResults, setSearchResults] = useState<SearchFood[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const today = format(new Date(), "yyyy-MM-dd");

    const fetchAll = useCallback(async () => {
        if (!user) return;

        // Water
        const { data: activities } = await supabase
            .from("user_activity")
            .select("water_intake_ml")
            .eq("user_id", user.id)
            .eq("date", today)
            .limit(1);
        setWaterIntake(activities?.[0]?.water_intake_ml || 0);

        // Meals
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

    const searchFoods = useCallback((query: string) => {
        if (!query.trim() || query.trim().length < 2) { setSearchResults([]); return; }
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data, error } = await supabase.functions.invoke("search-foods", { body: { query: query.trim() } });
                if (error) throw error;
                setSearchResults(data?.foods || []);
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        }, 400);
    }, []);

    // Cleanup search timeout on unmount
    useEffect(() => {
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    }, []);

    const ensureTodayActivity = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from("user_activity").select("id").eq("user_id", user.id).eq("date", today).limit(1);
        if (!data?.length) await supabase.from("user_activity").insert({ user_id: user.id, date: today });
    }, [user, today]);

    const handleAddWater = useCallback(async (ml: number) => {
        if (!user) return;
        await ensureTodayActivity();
        const newIntake = waterIntake + ml;
        await supabase.from("user_activity").update({ water_intake_ml: newIntake }).eq("user_id", user.id).eq("date", today);
        setWaterIntake(newIntake);
    }, [user, today, waterIntake, ensureTodayActivity]);

    const ensureMealPlan = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        if (todayMealPlanId) return todayMealPlanId;
        const { data } = await supabase.from("meal_plans").insert({ user_id: user.id, date: today }).select("id").single();
        if (data) { setTodayMealPlanId(data.id); return data.id; }
        return null;
    }, [user, today, todayMealPlanId]);

    const handleAddFood = useCallback(async (mealTime: string, food: { name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }) => {
        const planId = await ensureMealPlan();
        if (!planId) return;
        const displayName = food.quantity ? `${food.name} (${food.quantity})` : food.name;
        await supabase.from("meals").insert({ meal_plan_id: planId, name: displayName, meal_time: mealTime, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat });
        fetchAll();
    }, [ensureMealPlan, fetchAll]);

    const handleDeleteFood = useCallback(async (foodId: string) => {
        await supabase.from("meals").delete().eq("id", foodId);
        fetchAll();
    }, [fetchAll]);

    const totalCalories = mealSlots.reduce((sum, slot) => sum + slot.items.reduce((s, i) => s + i.calories, 0), 0);
    const totalProtein = mealSlots.reduce((sum, slot) => sum + slot.items.reduce((s, i) => s + i.protein, 0), 0);

    return {
        user,
        mealSlots,
        waterIntake,
        searchResults,
        setSearchResults,
        searching,
        todayMealPlanId,
        setTodayMealPlanId,
        fetchAll,
        searchFoods,
        handleAddWater,
        ensureMealPlan,
        handleAddFood,
        handleDeleteFood,
        totalCalories,
        totalProtein,
    };
}
