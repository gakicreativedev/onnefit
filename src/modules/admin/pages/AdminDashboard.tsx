import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useRecipes } from "../hooks/useRecipes";
import { useAppUpdates } from "../hooks/useAppUpdates";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  UsersGroupTwoRoundedBold,
  ChefHatBold,
  DumbbellBold,
  BookBold,
  UserCheckRoundedBold,
  RunningRoundBold,
  ChartBold,
} from "solar-icon-set";

interface AdminMetrics {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  workoutsToday: number;
  totalRecipes: number;
  totalWorkouts: number;
  totalUpdates: number;
  onboardingRate: number;
  workoutsPerDay: { date: string; count: number }[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function AdminDashboard() {
  const { updates } = useAppUpdates();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("admin-metrics");
      if (data && !error) setMetrics(data);
      setLoading(false);
    })();
  }, []);

  const chartData = (metrics?.workoutsPerDay || []).map((d) => {
    const dt = new Date(d.date);
    return { ...d, label: `${dt.getDate()}/${dt.getMonth() + 1}` };
  });

  const stats = [
    { icon: UsersGroupTwoRoundedBold, label: "Usuários Total", value: metrics?.totalUsers ?? "—", color: "text-primary" },
    { icon: UserCheckRoundedBold, label: "Ativos Hoje", value: metrics?.activeToday ?? "—", color: "text-emerald-500" },
    { icon: RunningRoundBold, label: "Ativos (7d)", value: metrics?.activeWeek ?? "—", color: "text-blue-500" },
    { icon: DumbbellBold, label: "Treinos Hoje", value: metrics?.workoutsToday ?? "—", color: "text-amber-500" },
    { icon: ChefHatBold, label: "Receitas", value: metrics?.totalRecipes ?? "—", color: "text-primary" },
    { icon: DumbbellBold, label: "Treinos Globais", value: metrics?.totalWorkouts ?? "—", color: "text-emerald-500" },
    { icon: BookBold, label: "Atualizações", value: metrics?.totalUpdates ?? "—", color: "text-blue-500" },
    { icon: ChartBold, label: "Onboarding", value: metrics ? `${metrics.onboardingRate}%` : "—", color: "text-amber-500" },
  ];

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-5xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Painel <span className="text-primary">Admin</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Métricas em tempo real do app.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-2 rounded-[20px] bg-card p-4 sm:p-6">
                <stat.icon size={28} className={stat.color} color="currentColor" />
                <span className="text-2xl font-black text-foreground">{stat.value}</span>
                <span className="text-xs font-semibold text-muted-foreground text-center">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Workouts per day chart */}
          <motion.div variants={fadeUp} className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Treinos por Dia (últimos 7 dias)</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de treinos ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
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
                  />
                  <Bar dataKey="count" name="Treinos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Recent updates */}
          <motion.div variants={fadeUp}>
            <section className="rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Últimas Atualizações</h2>
              {updates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma atualização publicada ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {updates.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <BookBold size={18} color="currentColor" className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
