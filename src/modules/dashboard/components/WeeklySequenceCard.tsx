import { FireBold } from "solar-icon-set";

interface DayData {
  label: string;
  trained: boolean;
}

interface WeeklySequenceCardProps {
  days: DayData[];
}

export function WeeklySequenceCard({ days }: WeeklySequenceCardProps) {
  const trainedCount = days.filter((d) => d.trained).length;

  return (
    <section className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-7">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/15">
            <FireBold size={18} color="hsl(var(--primary))" />
          </div>
          <div>
            <h2
              className="text-lg sm:text-xl font-black uppercase text-card-foreground tracking-tight leading-none"
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
            >
              SEQUÊNCIA
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trainedCount}/7 dias esta semana
            </p>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 sm:gap-2">
        {days.map((day) => (
          <div
            key={day.label}
            className={`flex flex-1 flex-col items-center gap-1.5 sm:gap-2 rounded-2xl p-2 sm:p-3 transition-colors ${
              day.trained
                ? "bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
                : "bg-background"
            }`}
          >
            <span
              className={`text-[10px] sm:text-xs font-black uppercase ${
                day.trained ? "text-primary-foreground" : "text-muted-foreground"
              }`}
              style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
            >
              {day.label}
            </span>
            <div
              className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${
                day.trained ? "bg-primary-foreground/20" : "bg-card"
              }`}
            >
              <FireBold
                size={14}
                color={day.trained ? "hsl(0, 0%, 100%)" : "hsl(var(--muted-foreground))"}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
