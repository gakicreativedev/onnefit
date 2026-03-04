import { ACTIVITY_LEVELS } from "../../constants";
import { OptionCard } from "../OptionCard";
import type { OnboardingData } from "../../types";

interface ActivityLevelStepProps {
  data: OnboardingData;
  onUpdate: (field: keyof OnboardingData, value: any) => void;
}

export function ActivityLevelStep({ data, onUpdate }: ActivityLevelStepProps) {
  return (
    <div className="space-y-3">
      {ACTIVITY_LEVELS.map((a) => (
        <OptionCard
          key={a.value}
          label={a.label}
          desc={a.desc}
          selected={data.activity_level === a.value}
          onClick={() => onUpdate("activity_level", a.value)}
        />
      ))}
    </div>
  );
}
