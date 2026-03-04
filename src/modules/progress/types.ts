export interface BodyMeasurement {
    id: string;
    user_id: string;
    date: string; // ISO date YYYY-MM-DD
    weight_kg: number | null;
    body_fat_pct: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    chest_cm: number | null;
    arm_left_cm: number | null;
    arm_right_cm: number | null;
    thigh_left_cm: number | null;
    thigh_right_cm: number | null;
    neck_cm: number | null;
    notes: string | null;
    created_at: string;
}

export interface ProgressPhoto {
    id: string;
    user_id: string;
    date: string;
    photo_url: string;
    category: "front" | "side" | "back";
    notes: string | null;
    created_at: string;
}

export type MeasurementField = keyof Pick<
    BodyMeasurement,
    | "weight_kg"
    | "body_fat_pct"
    | "waist_cm"
    | "hip_cm"
    | "chest_cm"
    | "arm_left_cm"
    | "arm_right_cm"
    | "thigh_left_cm"
    | "thigh_right_cm"
    | "neck_cm"
>;

export const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
    weight_kg: "Peso (kg)",
    body_fat_pct: "Gordura (%)",
    waist_cm: "Cintura (cm)",
    hip_cm: "Quadril (cm)",
    chest_cm: "Peito (cm)",
    arm_left_cm: "Braço E (cm)",
    arm_right_cm: "Braço D (cm)",
    thigh_left_cm: "Coxa E (cm)",
    thigh_right_cm: "Coxa D (cm)",
    neck_cm: "Pescoço (cm)",
};

export const MEASUREMENT_ICONS: Record<MeasurementField, string> = {
    weight_kg: "⚖️",
    body_fat_pct: "📊",
    waist_cm: "📏",
    hip_cm: "📏",
    chest_cm: "📏",
    arm_left_cm: "💪",
    arm_right_cm: "💪",
    thigh_left_cm: "🦵",
    thigh_right_cm: "🦵",
    neck_cm: "📏",
};

export const PHOTO_CATEGORIES = [
    { value: "front" as const, label: "Frente" },
    { value: "side" as const, label: "Lateral" },
    { value: "back" as const, label: "Costas" },
];
