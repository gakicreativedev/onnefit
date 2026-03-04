import { DumbbellBold, CheckCircleBold, PlayBold } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DailyWorkoutCardProps {
  workoutName: string;
  workoutCompleted: boolean;
  onStartWorkout: () => void;
}

export function DailyWorkoutCard({ workoutName, workoutCompleted, onStartWorkout }: DailyWorkoutCardProps) {
  const navigate = useNavigate();

  return (
    <section className="relative flex flex-col justify-between gap-4 sm:gap-6 rounded-[20px] sm:rounded-[28px] bg-primary p-5 sm:p-8 overflow-hidden min-h-[220px] sm:min-h-[260px] h-full">
      {/* Decorative icon */}
      <DumbbellBold
        size={180}
        color="currentColor"
        className="absolute -right-6 -bottom-6 text-primary-foreground/[0.07] rotate-[-15deg] pointer-events-none"
      />

      <div className="relative z-10 flex flex-col gap-4">
        <span className="inline-flex items-center self-start gap-1.5 rounded-full bg-primary-foreground/15 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
          <PlayBold size={10} color="currentColor" />
          Treino do Dia
        </span>

        <h2
          className="text-3xl sm:text-5xl lg:text-6xl uppercase leading-[0.9] tracking-tight text-primary-foreground font-black whitespace-pre-line"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
        >
          {workoutName}
        </h2>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-3">
        {workoutCompleted ? (
          <div className="flex items-center gap-2 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm px-5 py-2.5">
            <CheckCircleBold size={18} color="currentColor" className="text-primary-foreground" />
            <span className="font-bold text-primary-foreground text-sm">Concluído!</span>
          </div>
        ) : (
          <Button
            onClick={() => navigate("/workouts")}
            className="rounded-2xl bg-card text-primary px-6 py-2.5 font-bold hover:bg-card/90 transition-all border-0 shadow-lg shadow-card/20"
          >
            Começar Treino
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate("/workouts")}
          className="rounded-2xl px-5 py-2.5 font-bold text-primary-foreground hover:bg-primary-foreground/10 border-0"
        >
          Ver Treinos →
        </Button>
      </div>
    </section>
  );
}
