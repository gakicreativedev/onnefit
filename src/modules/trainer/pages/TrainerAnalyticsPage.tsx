import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { ChartBold, DumbbellBold, FireBold, ScaleBold } from "solar-icon-set";

interface StudentSummary {
  id: string;
  name: string;
  weight_kg: number | null;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
  workouts_30d: number;
  active_days_30d: number;
}

interface WeeklyWorkouts {
  week: string;
  count: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const chartTheme = {
  grid: "hsl(var(--border))",
  text: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  accent: "hsl(var(--accent))",
};

export default function TrainerAnalyticsPage() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [workoutsByWeek, setWorkoutsByWeek] = useState<WeeklyWorkouts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("student-analytics");
      if (data && !error) {
        setStudents(data.students || []);
        setWorkoutsByWeek(data.workoutsByWeek || []);
      }
      setLoading(false);
    })();
  }, []);

  const weekLabels = workoutsByWeek.map((w) => {
    const d = new Date(w.week);
    return { ...w, label: `${d.getDate()}/${d.getMonth() + 1}` };
  });

  const radarData = students.map((s) => ({
    name: s.name?.split(" ")[0] || "Aluno",
    treinos: s.workouts_30d,
    streak: s.current_streak,
    diasAtivos: s.active_days_30d,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Evolução dos <span className="text-primary">Alunos</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o progresso dos últimos 30 dias.
        </p>
      </motion.div>

      {students.length === 0 ? (
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <ChartBold size={48} color="currentColor" />
          <p className="text-base font-semibold">Nenhum aluno ativo para exibir dados</p>
          <p className="text-sm">Vincule alunos e aguarde a atividade deles.</p>
        </motion.div>
      ) : (
        <>
          {/* Student stat cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {students.map((s) => (
              <div key={s.id} className="rounded-[20px] bg-card p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {s.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DumbbellBold size={12} color="currentColor" />
                      {s.workouts_30d}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FireBold size={12} color="currentColor" />
                      {s.current_streak}d
                    </span>
                    {s.weight_kg && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ScaleBold size={12} color="currentColor" />
                        {s.weight_kg}kg
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-primary">{s.active_days_30d}</p>
                  <p className="text-[10px] font-bold text-muted-foreground">dias ativos</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Workouts per week bar chart */}
          <motion.div variants={fadeUp} className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Treinos por Semana</h2>
            {weekLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de treinos ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weekLabels} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: chartTheme.text, fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chartTheme.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    labelStyle={{ color: chartTheme.text }}
                  />
                  <Bar
                    dataKey="count"
                    name="Treinos"
                    fill={chartTheme.primary}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Radar comparison chart */}
          {radarData.length > 1 && (
            <motion.div variants={fadeUp} className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Comparativo de Alunos</h2>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={chartTheme.grid} />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={{ fill: chartTheme.text, fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    tick={{ fill: chartTheme.text, fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Treinos"
                    dataKey="treinos"
                    stroke={chartTheme.primary}
                    fill={chartTheme.primary}
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Streak"
                    dataKey="streak"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
