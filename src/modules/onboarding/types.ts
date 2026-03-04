export interface OnboardingData {
  name: string;
  username: string;
  date_of_birth: string;
  gender: string;
  height_cm: number;
  weight_kg: number;
  goal: string;
  activity_level: string;
  injuries: string[];
  allergies: string[];
  dietary_restrictions: string[];
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  name: "",
  username: "",
  date_of_birth: "",
  gender: "male",
  height_cm: 175,
  weight_kg: 70,
  goal: "maintain",
  activity_level: "moderate",
  injuries: [],
  allergies: [],
  dietary_restrictions: [],
};
