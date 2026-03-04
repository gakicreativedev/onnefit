import { GOALS } from "../../constants";
import { OptionCard } from "../OptionCard";
import type { OnboardingData } from "../../types";

interface GoalStepProps {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: any) => void;
}

export function GoalStep({ data, onUpdate }: GoalStepProps) {
  return (
    <div className="space-y-3">
      {GOALS.map((g) => (
        <OptionCard
          key={g.value}
          label={g.label}
          desc={g.desc}
          selected={data.goal === g.value}
          onClick={() => onUpdate("goal", g.value)}
        />
      ))}
    </div>
  );
}
