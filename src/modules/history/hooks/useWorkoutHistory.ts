import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLog {
  id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
}

export interface WorkoutHistoryEntry {
  id: string;
  workout_id: string | null;
  workout_name: string;
  completed_at: string;
  duration_minutes: number | null;
  notes: string | null;
  exercise_logs?: ExerciseLog[];
}

export function useWorkoutHistory(userId: string | undefined) {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("workout_history")
      .select("*, exercise_logs(*)")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(100);
    if (data) setHistory(data as WorkoutHistoryEntry[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const logWorkout = useCallback(async (
    workoutName: string,
    workoutId: string | null,
    exercises: Omit<ExerciseLog, "id">[],
    durationMinutes?: number,
    notes?: string
  ) => {
    if (!userId) return;
    const { data: historyEntry } = await supabase
      .from("workout_history")
      .insert({
        user_id: userId,
        workout_id: workoutId,
        workout_name: workoutName,
        duration_minutes: durationMinutes || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (historyEntry && exercises.length > 0) {
      await supabase.from("exercise_logs").insert(
        exercises.map((ex) => ({
          history_id: historyEntry.id,
          exercise_name: ex.exercise_name,
          set_number: ex.set_number,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
        }))
      );
    }
    await fetchHistory();
  }, [userId, fetchHistory]);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from("workout_history").delete().eq("id", id);
    await fetchHistory();
  }, [fetchHistory]);

  // Get progression data for a specific exercise
  const getProgression = useCallback((exerciseName: string) => {
    const logs: { date: string; maxWeight: number; totalVolume: number }[] = [];
    
    // Group by workout session date
    for (const entry of [...history].reverse()) {
      const exerciseLogs = entry.exercise_logs?.filter(
        (l) => l.exercise_name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (exerciseLogs && exerciseLogs.length > 0) {
        const maxWeight = Math.max(...exerciseLogs.map((l) => l.weight_kg));
        const totalVolume = exerciseLogs.reduce((sum, l) => sum + l.weight_kg * l.reps, 0);
        logs.push({
          date: new Date(entry.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          maxWeight,
          totalVolume,
        });
      }
    }
    return logs;
  }, [history]);

  // Get unique exercise names from history
  const getExerciseNames = useCallback(() => {
    const names = new Set<string>();
    history.forEach((entry) => {
      entry.exercise_logs?.forEach((log) => names.add(log.exercise_name));
    });
    return Array.from(names);
  }, [history]);

  return { history, loading, logWorkout, deleteEntry, getProgression, getExerciseNames, refetch: fetchHistory };
}
