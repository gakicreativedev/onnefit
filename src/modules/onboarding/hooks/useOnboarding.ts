import { useState } from "react";
import { toast } from "sonner";
import { TOTAL_STEPS } from "../constants";
import { isValidDate, calculateAge } from "../utils";
import type { OnboardingData } from "../types";
import { INITIAL_ONBOARDING_DATA } from "../types";

export function useOnboarding(onComplete: (data: OnboardingData) => Promise<void>) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);

  const update = (field: keyof OnboardingData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canAdvanceStep1 =
    data.name.trim().length > 0 &&
    /^[a-z0-9._]{3,20}$/.test(data.username) &&
    isValidDate(data.date_of_birth) &&
    calculateAge(data.date_of_birth) >= 10;

  const handleNext = () => {
    if (step === 1 && !canAdvanceStep1) {
      toast.error("Preencha o nome, @ de usuário e data de nascimento válida");
      return;
    }
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await onComplete(data);
    } catch {
      toast.error("Algo deu errado. Tente novamente.");
    }
    setLoading(false);
  };

  return {
    step,
    direction,
    data,
    loading,
    update,
    handleNext,
    handleBack,
    handleFinish,
    isLastStep: step === TOTAL_STEPS,
    isFirstStep: step === 1,
  };
}
