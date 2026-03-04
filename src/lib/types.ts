/**
 * Centralized shared types for the Onne Fit app.
 * Avoids type duplication across modules.
 */

/* ── Nutrition / Diet ── */

export interface FoodItem {
    id: string;
    name: string;
    quantity: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface MealSlot {
    key: string;
    label: string;
    items: FoodItem[];
}

export interface SearchFood {
    id: string;
    name: string;
    brand: string | null;
    serving: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export const MEAL_TIMES = [
    { key: "breakfast", label: "Café da Manhã" },
    { key: "lunch", label: "Almoço" },
    { key: "snack", label: "Lanche" },
    { key: "dinner", label: "Jantar" },
] as const;

export type MealTimeKey = (typeof MEAL_TIMES)[number]["key"];

/* ── Workouts ── */

export interface Workout {
    id: string;
    user_id: string | null;
    name: string;
    description: string | null;
    muscle_groups: string[] | null;
    difficulty: string | null;
    duration_minutes: number | null;
    is_shared: boolean;
    day_of_week: number | null;
    _isLocal?: boolean;
}

export interface Exercise {
    id: string;
    exercise_name: string;
    sets: number;
    reps: number;
    rest_seconds: number | null;
    sort_order: number | null;
    media_url?: string;
}

export interface SetLog {
    reps: number;
    weight_kg: number;
    completed: boolean;
}

export interface ExerciseTracker {
    exercise_name: string;
    target_sets: number;
    target_reps: number;
    rest_seconds: number;
    sets: SetLog[];
    media_url?: string;
}

/* ── Social ── */

export interface UserPost {
    id: string;
    content: string | null;
    image_url: string | null;
    created_at: string;
    likes_count: number;
    comments_count: number;
}

/* ── Constants ── */

export const DAY_LABELS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

export const DAY_LABELS_FULL: Record<number, string> = {
    0: "Domingo",
    1: "Segunda-Feira",
    2: "Terça-Feira",
    3: "Quarta-Feira",
    4: "Quinta-Feira",
    5: "Sexta-Feira",
    6: "Sábado",
};

export const GOAL_LABELS: Record<string, string> = {
    lose_weight: "Perder Peso",
    gain_muscle: "Ganhar Músculo",
    recomposition: "Recomposição",
    maintain: "Manter",
};

export const ACTIVITY_LABELS: Record<string, string> = {
    sedentary: "Sedentário",
    light: "Leve",
    moderate: "Moderado",
    active: "Ativo",
    very_active: "Muito Ativo",
};
