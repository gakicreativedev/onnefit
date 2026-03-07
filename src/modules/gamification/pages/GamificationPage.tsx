import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useXP, getLevel, type XPEntry } from "@/modules/gamification/hooks/useXP";
import { useStreak } from "@/modules/gamification/hooks/useStreak";
import { Progress } from "@/components/ui/progress";
import {
  FireBold,
  CupStarBold,
  MedalRibbonStarBold,
  GraphUpBold,
  StarBold,
  DumbbellBold,
  ChefHatBold,
  WaterdropsBold,
  CrownBold,
  MedalRibbonBold,
} from "solar-icon-set";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

/* ── Badge definitions ── */
interface Badge {
  id: string;
  label: string;
  description: string;
  icon: typeof FireBold;
  color: string;
  requirement: (xp: number, streak: number, history: XPEntry[]) => boolean;
}

const BADGES: Badge[] = [
  {
    id: "first_workout",
    label: "Primeiro Treino",
    description: "Complete seu primeiro treino",
    icon: DumbbellBold,
    color: "text-blue-400",
    requirement: (_, __, h) => h.some((e) => e.source === "workout_completed"),
  },
  {
    id: "first_diet",
    label: "Dieta Registrada",
    description: "Registre sua primeira refeição",
    icon: ChefHatBold,
    color: "text-green-400",
    requirement: (_, __, h) => h.some((e) => e.source === "diet_logged"),
  },
  {
    id: "hydrated",
    label: "Hidratado",
    description: "Atinja a meta de água",
    icon: WaterdropsBold,
    color: "text-cyan-400",
    requirement: (_, __, h) => h.some((e) => e.source === "water_goal"),
  },
  {
    id: "streak_3",
    label: "3 Dias Seguidos",
    description: "Mantenha um streak de 3 dias",
    icon: FireBold,
    color: "text-orange-400",
    requirement: (_, s) => s >= 3,
  },
  {
    id: "streak_7",
    label: "Semana de Fogo",
    description: "Mantenha um streak de 7 dias",
    icon: FireBold,
    color: "text-red-400",
    requirement: (_, s) => s >= 7,
  },
  {
    id: "streak_30",
    label: "Mês Imparável",
    description: "Mantenha um streak de 30 dias",
    icon: CrownBold,
    color: "text-yellow-400",
    requirement: (_, s) => s >= 30,
  },
  {
    id: "level_5",
    label: "Nível 5",
    description: "Alcance o nível 5",
    icon: StarBold,
    color: "text-purple-400",
    requirement: (xp) => getLevel(xp).level >= 5,
  },
  {
    id: "level_10",
    label: "Nível 10",
    description: "Alcance o nível 10",
    icon: MedalRibbonStarBold,
    color: "text-amber-400",
    requirement: (xp) => getLevel(xp).level >= 10,
  },
  {
    id: "xp_1000",
    label: "1000 XP",
    description: "Acumule 1.000 pontos de XP",
    icon: GraphUpBold,
    color: "text-emerald-400",
    requirement: (xp) => xp >= 1000,
  },
];

/* ── Source icon map ── */
const SOURCE_ICONS: Record<string, typeof FireBold> = {
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

const containerVariant = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function GamificationPage() {
  const { user } = useAuth();
  const { totalXP, level, history, loading } = useXP(user?.id);
  const { streak, loading: streakLoading } = useStreak(user?.id);
  const [dbBadges, setDbBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    async function fetchDbBadges() {
      if (!user) return;
      // @ts-ignore
      const { data } = await (supabase as any).from("user_badges").select("*").eq("user_id", user.id).order("awarded_at", { ascending: false });
      if (data) setDbBadges(data);
      setLoadingBadges(false);
    }
    fetchDbBadges();
  }, [user]);

  if (loading || streakLoading || loadingBadges) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const unlockedBadges = BADGES.filter((b) =>
    b.requirement(totalXP, Math.max(streak.current_streak, streak.longest_streak), history)
  );
  const lockedBadges = BADGES.filter(
    (b) => !b.requirement(totalXP, Math.max(streak.current_streak, streak.longest_streak), history)
  );

  return (
    <motion.div
      className="flex flex-col gap-6 max-w-4xl mx-auto"
      variants={containerVariant}
      initial="hidden"
      animate="show"
    >
      {/* ── Level & XP Hero ── */}
      <motion.section
        variants={itemVariant}
        className="rounded-[34px] bg-primary p-6 sm:p-8 lg:p-10 flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <CupStarBold size={28} color="currentColor" className="text-card" />
          <h1
            className="text-2xl sm:text-4xl font-black uppercase text-card tracking-tight"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
          >
            Seu Progresso
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Level */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card/15 p-4 backdrop-blur">
            <span className="text-4xl font-black text-card">{level.level}</span>
            <span className="text-xs font-bold text-card/70 uppercase mt-1">Nível</span>
          </div>

          {/* Total XP */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card/15 p-4 backdrop-blur">
            <span className="text-4xl font-black text-card">{totalXP.toLocaleString("pt-BR")}</span>
            <span className="text-xs font-bold text-card/70 uppercase mt-1">XP Total</span>
          </div>

          {/* Current Streak */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card/15 p-4 backdrop-blur">
            <span className="text-4xl font-black text-card">{streak.current_streak}</span>
            <span className="text-xs font-bold text-card/70 uppercase mt-1">Streak Atual</span>
          </div>

          {/* Longest Streak */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-card/15 p-4 backdrop-blur">
            <span className="text-4xl font-black text-card">{streak.longest_streak}</span>
            <span className="text-xs font-bold text-card/70 uppercase mt-1">Maior Streak</span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-card/80">
            <span>Nível {level.level}</span>
            <span>
              {totalXP - level.currentThreshold} / {level.nextThreshold - level.currentThreshold} XP
            </span>
            <span>Nível {level.level + 1}</span>
          </div>
          <Progress value={level.progress} className="h-3 bg-card/20 [&>div]:bg-card" />
        </div>
      </motion.section>

      {/* ── Badges ── */}
      <motion.section variants={itemVariant} className="rounded-[34px] bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl sm:text-2xl font-black text-card-foreground"
            style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
          >
            Conquistas
          </h2>
          <span className="text-sm font-bold text-muted-foreground">
            {unlockedBadges.length}/{BADGES.length}
          </span>
        </div>

        {/* Unlocked Badges */}
        {unlockedBadges.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
            {unlockedBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.06 }}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Icon size={24} color="currentColor" className={badge.color} />
                  </div>
                  <span className="text-xs font-bold text-card-foreground leading-tight">
                    {badge.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Unlocked DB Badges (Challenges etc) */}
        {dbBadges.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
            {dbBadges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.06 }}
                className="flex flex-col items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-2xl">
                  {badge.badge_icon || "🏅"}
                </div>
                <span className="text-xs font-bold text-card-foreground leading-tight">
                  {badge.badge_name}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Bloqueadas</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {lockedBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-muted/30 p-4 text-center opacity-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                      <Icon size={24} color="currentColor" className="text-muted-foreground" />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground leading-tight">
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 leading-tight">
                      {badge.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.section>

      {/* ── XP History ── */}
      <motion.section variants={itemVariant} className="rounded-[34px] bg-card p-6 sm:p-8">
        <h2
          className="text-xl sm:text-2xl font-black text-card-foreground mb-5"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
        >
          Histórico de XP
        </h2>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <StarBold size={48} color="currentColor" className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma atividade registrada ainda</p>
            <p className="text-muted-foreground text-sm">Complete treinos e registre dietas para ganhar XP!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.slice(0, 20).map((entry) => {
              const Icon = SOURCE_ICONS[entry.source] || StarBold;
              const label = SOURCE_LABELS[entry.source] || entry.description || entry.source;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-muted/50 p-4 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
                      <Icon size={18} color="currentColor" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-primary">+{entry.amount} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
