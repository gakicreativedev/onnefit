import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useWorkoutHistory } from "@/modules/history/hooks/useWorkoutHistory";
import { useXP } from "@/modules/gamification/hooks/useXP";
import { useStreak } from "@/modules/gamification/hooks/useStreak";
import { loadLocalWorkouts, saveLocalWorkouts, duplicateLocalWorkout } from "@/modules/workouts/components/CreateEditWorkoutDialog";
import { toast } from "sonner";
import type { Workout, Exercise, ExerciseTracker } from "@/lib/types";

const STORAGE_KEY = "fitsoul_active_workout";

function saveWorkoutToStorage(data: {
    activeWorkout: Workout;
    trackers: ExerciseTracker[];
    startTime: string;
}) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
}

function loadWorkoutFromStorage(): {
    activeWorkout: Workout;
    trackers: ExerciseTracker[];
    startTime: string;
} | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function clearWorkoutStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

export function useWorkoutTracker() {
    const { user } = useAuth();
    const { history, logWorkout, deleteEntry, getProgression, getExerciseNames } = useWorkoutHistory(user?.id);
    const { awardXP } = useXP(user?.id);
    const { recordActivity } = useStreak(user?.id);

    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [todayExercises, setTodayExercises] = useState<Exercise[]>([]);
    const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
    const [trackers, setTrackers] = useState<ExerciseTracker[]>([]);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);
    const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());
    const [restTimer, setRestTimer] = useState<{ seconds: number; name: string } | null>(null);
    const restoredRef = useRef(false);

    const todayDow = new Date().getDay();

    // Merge remote + local workouts
    const loadAllWorkouts = useCallback(async () => {
        const { data } = await supabase.from("workouts").select("*");
        const remote: Workout[] = (data || []).map((w: any) => ({ ...w, _isLocal: false }));
        const local = loadLocalWorkouts();
        const localAsWorkouts: Workout[] = local.map((lw) => ({
            id: lw.id,
            user_id: user?.id || null,
            name: lw.name,
            description: null,
            muscle_groups: null,
            difficulty: null,
            duration_minutes: null,
            is_shared: false,
            day_of_week: lw.day_of_week,
            _isLocal: true,
        }));
        setWorkouts([...remote, ...localAsWorkouts]);
    }, [user?.id]);

    // Restore workout from localStorage on mount
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        const saved = loadWorkoutFromStorage();
        if (saved) {
            setActiveWorkout(saved.activeWorkout);
            setTrackers(saved.trackers);
            setStartTime(new Date(saved.startTime));
        }
    }, []);

    // Auto-save workout progress whenever trackers change
    useEffect(() => {
        if (activeWorkout && startTime && trackers.length > 0) {
            saveWorkoutToStorage({
                activeWorkout,
                trackers,
                startTime: startTime.toISOString(),
            });
        }
    }, [activeWorkout, trackers, startTime]);

    useEffect(() => {
        loadAllWorkouts();
    }, [loadAllWorkouts]);

    const todayWorkout = workouts.find((w) => w.day_of_week === todayDow) || workouts[0];

    useEffect(() => {
        if (!todayWorkout) return;
        if (todayWorkout._isLocal) {
            const local = loadLocalWorkouts().find((l) => l.id === todayWorkout.id);
            if (local) {
                setTodayExercises(
                    local.exercises.map((ex, i) => ({
                        id: `local_ex_${i}`,
                        exercise_name: ex.exercise_name,
                        sets: ex.sets,
                        reps: ex.reps,
                        rest_seconds: ex.rest_seconds,
                        sort_order: i,
                    }))
                );
            }
        } else {
            supabase
                .from("workout_exercises")
                .select("*")
                .eq("workout_id", todayWorkout.id)
                .order("sort_order")
                .then(({ data }) => {
                    if (data) setTodayExercises(data as Exercise[]);
                });
        }
    }, [todayWorkout]);

    const toggleExerciseCollapse = useCallback((idx: number) => {
        setCollapsedExercises((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    const startWorkout = useCallback((workout: Workout, exercises: Exercise[]) => {
        const newTrackers = exercises.map((ex) => ({
            exercise_name: ex.exercise_name,
            target_sets: ex.sets,
            target_reps: ex.reps,
            rest_seconds: ex.rest_seconds || 60,
            media_url: ex.media_url,
            sets: Array.from({ length: ex.sets }, () => ({
                reps: ex.reps,
                weight_kg: 0,
                completed: false,
            })),
        }));
        const now = new Date();
        setActiveWorkout(workout);
        setStartTime(now);
        setTrackers(newTrackers);
        setCollapsedExercises(new Set());
        saveWorkoutToStorage({ activeWorkout: workout, trackers: newTrackers, startTime: now.toISOString() });
    }, []);

    const updateSet = useCallback((exIdx: number, setIdx: number, field: "reps" | "weight_kg", value: number) => {
        setTrackers((prev) => {
            const next = [...prev];
            next[exIdx] = {
                ...next[exIdx],
                sets: next[exIdx].sets.map((s, i) =>
                    i === setIdx ? { ...s, [field]: Math.max(0, value) } : s
                ),
            };
            return next;
        });
    }, []);

    const toggleSetComplete = useCallback((exIdx: number, setIdx: number) => {
        setTrackers((prev) => {
            const next = [...prev];
            const wasCompleted = next[exIdx].sets[setIdx].completed;
            next[exIdx] = {
                ...next[exIdx],
                sets: next[exIdx].sets.map((s, i) =>
                    i === setIdx ? { ...s, completed: !s.completed } : s
                ),
            };
            if (!wasCompleted) {
                setRestTimer({ seconds: next[exIdx].rest_seconds, name: next[exIdx].exercise_name });
            }
            return next;
        });
    }, []);

    const cancelWorkout = useCallback(() => {
        clearWorkoutStorage();
        setActiveWorkout(null);
        setTrackers([]);
        setStartTime(null);
    }, []);

    const finishWorkout = useCallback(async () => {
        if (!activeWorkout || !startTime || !user) return;
        setSaving(true);

        const durationMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
        const exerciseLogs = trackers.flatMap((tracker) =>
            tracker.sets
                .filter((s) => s.completed)
                .map((s, i) => ({
                    exercise_name: tracker.exercise_name,
                    set_number: i + 1,
                    reps: s.reps,
                    weight_kg: s.weight_kg,
                }))
        );

        if (exerciseLogs.length === 0) {
            toast.error("Complete pelo menos uma série antes de finalizar!");
            setSaving(false);
            return;
        }

        await logWorkout(activeWorkout.name, activeWorkout._isLocal ? null : activeWorkout.id, exerciseLogs, durationMinutes);

        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabase
            .from("user_activity")
            .select("id")
            .eq("user_id", user.id)
            .eq("date", today)
            .limit(1);
        if (!existing?.length) {
            await supabase.from("user_activity").insert({ user_id: user.id, date: today, workout_completed: true });
        } else {
            await supabase.from("user_activity").update({ workout_completed: true }).eq("user_id", user.id).eq("date", today);
        }

        await awardXP("workout_completed", `Treino: ${activeWorkout.name}`);
        await recordActivity();

        toast.success("Treino salvo no histórico!", { description: `${exerciseLogs.length} séries registradas` });
        clearWorkoutStorage();
        setActiveWorkout(null);
        setTrackers([]);
        setStartTime(null);
        setSaving(false);
    }, [activeWorkout, startTime, user, trackers, logWorkout, awardXP, recordActivity]);

    const handleStartLocalWorkout = useCallback((w: Workout) => {
        const local = loadLocalWorkouts().find((l) => l.id === w.id);
        if (!local || local.exercises.length === 0) {
            toast.error("Este treino não tem exercícios cadastrados");
            return;
        }
        const exercises: Exercise[] = local.exercises.map((ex, i) => ({
            id: `local_ex_${i}`,
            exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            sort_order: i,
            media_url: ex.media_url,
        }));
        startWorkout(w, exercises);
    }, [startWorkout]);

    const handleEditLocal = useCallback((w: Workout) => {
        const local = loadLocalWorkouts().find((l) => l.id === w.id);
        return local || null;
    }, []);

    const handleDuplicateLocal = useCallback((w: Workout) => {
        const copy = duplicateLocalWorkout(w.id);
        if (copy) {
            loadAllWorkouts();
            toast.success("Treino duplicado!");
        }
    }, [loadAllWorkouts]);

    const handleDeleteLocal = useCallback((w: Workout) => {
        if (!window.confirm("Excluir este treino?")) return;
        const all = loadLocalWorkouts().filter((l) => l.id !== w.id);
        saveLocalWorkouts(all);
        loadAllWorkouts();
        toast.success("Treino excluído!");
    }, [loadAllWorkouts]);

    const completedSets = trackers.reduce((sum, t) => sum + t.sets.filter((s) => s.completed).length, 0);
    const totalSets = trackers.reduce((sum, t) => sum + t.sets.length, 0);

    return {
        user,
        workouts,
        setWorkouts,
        todayWorkout,
        todayExercises,
        activeWorkout,
        trackers,
        startTime,
        saving,
        collapsedExercises,
        restTimer,
        setRestTimer,
        history,
        deleteEntry,
        getProgression,
        getExerciseNames,
        loadAllWorkouts,
        toggleExerciseCollapse,
        startWorkout,
        updateSet,
        toggleSetComplete,
        cancelWorkout,
        finishWorkout,
        handleStartLocalWorkout,
        handleEditLocal,
        handleDuplicateLocal,
        handleDeleteLocal,
        completedSets,
        totalSets,
    };
}
