import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ClockCircleBold, PlayBold, PauseBold, RestartBold, CloseCircleBold } from "solar-icon-set";

interface RestTimerProps {
  seconds: number;
  exerciseName: string;
  onClose: () => void;
}

export function RestTimer({ seconds, exerciseName, onClose }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isRunning, setIsRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setIsRunning(false);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const percent = seconds > 0 ? ((seconds - timeLeft) / seconds) * 100 : 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-[34px] bg-card p-8 sm:p-12 shadow-2xl max-w-sm w-full mx-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ClockCircleBold size={20} color="currentColor" />
            <span className="text-sm font-bold text-muted-foreground">Descanso</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <CloseCircleBold size={20} color="currentColor" />
          </button>
        </div>

        <p className="text-sm font-semibold text-card-foreground text-center">{exerciseName}</p>

        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg width="210" height="210" className="-rotate-90">
            <circle cx="105" cy="105" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="105" cy="105" r={radius} fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-5xl font-black text-card-foreground tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
            {timeLeft === 0 && (
              <span className="text-sm font-bold text-primary mt-1">Pronto!</span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={() => { setTimeLeft(seconds); setIsRunning(false); }}
          >
            <RestartBold size={20} color="currentColor" />
          </Button>
          <Button
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={() => {
              if (timeLeft === 0) { setTimeLeft(seconds); setIsRunning(true); }
              else setIsRunning(!isRunning);
            }}
          >
            {isRunning ? <PauseBold size={24} color="currentColor" /> : <PlayBold size={24} color="currentColor" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={onClose}
          >
            <CloseCircleBold size={20} color="currentColor" />
          </Button>
        </div>
      </div>
    </div>
  );
}
