import { TOTAL_STEPS, STEP_TITLES } from "../constants";
import { User, Target, Activity, ShieldPlus } from "lucide-react";

const STEP_ICONS = [User, Target, Activity, ShieldPlus];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const Icon = STEP_ICONS[currentStep - 1];

  return (
    <div className="text-center space-y-2">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">
        {STEP_TITLES[currentStep - 1]}
      </h2>
      <p className="text-sm text-muted-foreground">
        Etapa {currentStep} de {TOTAL_STEPS}
      </p>
      <div className="flex gap-1.5 justify-center pt-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-12 rounded-full transition-colors ${
              i < currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
