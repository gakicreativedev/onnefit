import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminWorkout {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  difficulty: string | null;
  duration_minutes: number | null;
  muscle_groups: string[] | null;
  is_shared: boolean;
  user_id: string | null;
  created_at: string;
  exercises: AdminWorkoutExercise[];
}

export interface AdminWorkoutExercise {
  id: string;
  workout_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  sort_order: number | null;
}

export function useAdminWorkouts() {
  const [workouts, setWorkouts] = useState<AdminWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workouts")
      .select("*, workout_exercises(*)")
      .order("created_at", { ascending: false });

    const mapped = (data || []).map((w: any) => ({
      ...w,
      exercises: (w.workout_exercises || []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
    }));
    setWorkouts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const addWorkout = async (
    workout: { name: string; description?: string; day_of_week?: number | null; difficulty?: string; is_shared?: boolean; muscle_groups?: string[] },
    exercises: { exercise_name: string; sets: number; reps: number; rest_seconds: number }[],
    userId: string
  ) => {
    const { data, error } = await supabase
      .from("workouts")
      .insert({
        name: workout.name,
        description: workout.description || null,
        day_of_week: workout.day_of_week ?? null,
        difficulty: workout.difficulty || "beginner",
        is_shared: workout.is_shared ?? true,
        muscle_groups: workout.muscle_groups || null,
        user_id: userId,
      })
      .select()
      .single();

    if (error || !data) return { error };

    if (exercises.length > 0) {
      const rows = exercises.map((ex, i) => ({
        workout_id: data.id,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        sort_order: i,
      }));
      await supabase.from("workout_exercises").insert(rows);
    }

    await fetchWorkouts();
    return { error: null };
  };

  const updateWorkout = async (
    workoutId: string,
    workout: { name: string; description?: string; day_of_week?: number | null; difficulty?: string; is_shared?: boolean; muscle_groups?: string[] },
    exercises: { exercise_name: string; sets: number; reps: number; rest_seconds: number }[]
  ) => {
    const { error } = await supabase
      .from("workouts")
      .update({
        name: workout.name,
        description: workout.description || null,
        day_of_week: workout.day_of_week ?? null,
        difficulty: workout.difficulty || "beginner",
        is_shared: workout.is_shared ?? true,
        muscle_groups: workout.muscle_groups || null,
      })
      .eq("id", workoutId);

    if (error) return { error };

    // Replace exercises
    await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    if (exercises.length > 0) {
      const rows = exercises.map((ex, i) => ({
        workout_id: workoutId,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        sort_order: i,
      }));
      await supabase.from("workout_exercises").insert(rows);
    }

    await fetchWorkouts();
    return { error: null };
  };

  const deleteWorkout = async (id: string) => {
    await supabase.from("workout_exercises").delete().eq("workout_id", id);
    await supabase.from("workouts").delete().eq("id", id);
    await fetchWorkouts();
  };

  return { workouts, loading, addWorkout, updateWorkout, deleteWorkout, refetch: fetchWorkouts };
}
