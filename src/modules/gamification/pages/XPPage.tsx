import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useXP, getLevel } from "../hooks/useXP";
import { useStreak } from "../hooks/useStreak";
import { Progress } from "@/components/ui/progress";
import { FireBold, CupStarBold, BoltBold, StarBold, WaterdropsBold, DumbbellBold, ChefHatBold } from "solar-icon-set";

const SOURCE_ICONS: Record<string, any> = {
  workout_completed: DumbbellBold,
  diet_logged: ChefHatBold,
  water_goal: WaterdropsBold,
  streak_bonus_3: FireBold,
  streak_bonus_7: FireBold,
  streak_bonus_30: CupStarBold,
};

const SOURCE_LABELS: Record<string, string> = {
  workout_completed: "Treino completo",
  diet_logged: "Dieta registrada",
  water_goal: "Meta de água",
  streak_bonus_3: "Streak 3 dias",
  streak_bonus_7: "Streak 7 dias",
  streak_bonus_30: "Streak 30 dias",
};

export default function XPPage() {
  const { user } = useAuth();
  const { level, history, loading } = useXP(user?.id);
  const { streak } = useStreak(user?.id);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* ── Level Hero ── */}
      <section className="relative flex flex-col gap-5 rounded-[34px] bg-primary p-6 sm:p-8 lg:p-10 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-card/70 text-sm font-bold uppercase tracking-wider">Seu Nível</p>
            <h2 className="text-5xl sm:text-7xl font-black text-card" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              Level {String(level.level).padStart(2, "0")}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <BoltBold size={24} color="currentColor" className="text-card" />
            <span className="text-2xl sm:text-3xl font-black text-card">{level.totalXP} XP</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-card/70 font-bold">
            <span>{level.totalXP - level.currentThreshold} / {level.nextThreshold - level.currentThreshold} XP</span>
            <span>Level {level.level + 1}</span>
          </div>
          <Progress value={level.progress} className="h-3 bg-card/20 [&>div]:bg-card" />
        </div>
      </section>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="flex flex-col items-center gap-2 rounded-[24px] bg-card p-6">
          <FireBold size={32} color="currentColor" className="text-primary" />
          <span className="text-3xl font-black text-card-foreground">{streak.current_streak}</span>
          <span className="text-xs text-muted-foreground font-bold">Streak Atual</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-[24px] bg-card p-6">
          <CupStarBold size={32} color="currentColor" className="text-primary" />
          <span className="text-3xl font-black text-card-foreground">{streak.longest_streak}</span>
          <span className="text-xs text-muted-foreground font-bold">Maior Streak</span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-[24px] bg-card p-6 col-span-2 sm:col-span-1">
          <StarBold size={32} color="currentColor" className="text-primary" />
          <span className="text-3xl font-black text-card-foreground">{history.length}</span>
          <span className="text-xs text-muted-foreground font-bold">Ações Premiadas</span>
        </div>
      </div>

      {/* ── XP History ── */}
      <section className="flex flex-col gap-5 rounded-[34px] bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
            Histórico de XP
          </h3>
          <BoltBold size={28} color="currentColor" className="text-primary" />
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <BoltBold size={48} color="currentColor" className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum XP ganho ainda</p>
            <p className="text-muted-foreground text-sm">Complete treinos e registre dietas para ganhar XP!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry) => {
              const Icon = SOURCE_ICONS[entry.source] || StarBold;
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <Icon size={20} color="currentColor" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">
                        {SOURCE_LABELS[entry.source] || entry.description || entry.source}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-black text-primary">+{entry.amount}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
