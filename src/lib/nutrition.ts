/**
 * Centralized nutrition calculation utilities.
 * Single source of truth for BMR, calorie targets, protein targets, and water targets.
 */

/** Mifflin-St Jeor BMR formula */
export function calculateBMR(gender: string, weightKg: number, heightCm: number, age: number): number {
  if (gender === "male") return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** TDEE-based calorie target adjusted for goal */
export function calculateCalorieTarget(bmr: number, activityLevel: string, goal: string): number {
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55);
  if (goal === "lose_weight") return Math.round(tdee - 500);
  if (goal === "gain_muscle") return Math.round(tdee + 300);
  if (goal === "recomposition") return Math.round(tdee);
  return Math.round(tdee);
}

const PROTEIN_MULTIPLIERS: Record<string, number> = {
  gain: 1.6,
  gain_muscle: 1.6,
  recomposition: 1.6,
  lose: 1.4,
  lose_weight: 1.4,
  maintain: 1.2,
};

/** Protein target in grams based on weight and goal */
export function calculateProteinTarget(weightKg: number, goal: string): number {
  return Math.round(weightKg * (PROTEIN_MULTIPLIERS[goal] || 1.2));
}

/** Returns the protein multiplier used for a given goal (useful for display) */
export function getProteinMultiplier(goal: string): number {
  return PROTEIN_MULTIPLIERS[goal] || 1.2;
}

const WATER_ACTIVITY_MULTIPLIERS: Record<string, number> = {
  very_active: 1.3,
  active: 1.15,
  moderate: 1.0,
  light: 0.95,
  sedentary: 0.9,
};

/** Water target in ml based on weight and activity level (35ml/kg × activity) */
export function calculateWaterTargetMl(weightKg: number, activityLevel: string): number {
  return Math.round(weightKg * 35 * (WATER_ACTIVITY_MULTIPLIERS[activityLevel] || 1.0));
}

/** Water target in liters (rounded to 1 decimal) */
export function calculateWaterTargetL(weightKg: number, activityLevel: string): number {
  return parseFloat((calculateWaterTargetMl(weightKg, activityLevel) / 1000).toFixed(1));
}

/** Returns the water activity multiplier for display */
export function getWaterActivityMultiplier(activityLevel: string): number {
  return WATER_ACTIVITY_MULTIPLIERS[activityLevel] || 1.0;
}
