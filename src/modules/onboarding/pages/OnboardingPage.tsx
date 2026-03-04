import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { StepIndicator } from "../components/StepIndicator";
import { PersonalInfoStep } from "../components/steps/PersonalInfoStep";
import { GoalStep } from "../components/steps/GoalStep";
import { ActivityLevelStep } from "../components/steps/ActivityLevelStep";
import { HealthRestrictionsStep } from "../components/steps/HealthRestrictionsStep";
import { useOnboarding } from "../hooks/useOnboarding";
import type { OnboardingData } from "../types";

interface OnboardingPageProps {
  onComplete: (data: OnboardingData) => Promise<void>;
}

const STEP_COMPONENTS = [PersonalInfoStep, GoalStep, ActivityLevelStep, HealthRestrictionsStep];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const {
    step,
    direction,
    data,
    loading,
    update,
    handleNext,
    handleBack,
    handleFinish,
    isLastStep,
    isFirstStep,
  } = useOnboarding(onComplete);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const StepComponent = STEP_COMPONENTS[step - 1];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border bg-card overflow-hidden">
        <CardHeader>
          <StepIndicator currentStep={step} />
        </CardHeader>
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <StepComponent data={data} onUpdate={update} />
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {!isFirstStep && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
            {!isLastStep ? (
              <Button onClick={handleNext} className="flex-1">
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="flex-1">
                {loading ? "Salvando..." : "Começar Sua Jornada"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <button
        onClick={handleSignOut}
        className="mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sair e voltar ao login
      </button>
    </div>
  );
}

export type { OnboardingData };
