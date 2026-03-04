import { useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useWorkoutHistory } from "../hooks/useWorkoutHistory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HistoryBold, DumbbellBold, GraphUpBold, TrashBinTrashBold, AltArrowDownBold, AltArrowUpBold } from "solar-icon-set";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function HistoryPage() {
  const { user } = useAuth();
  const { history, loading, deleteEntry, getProgression, getExerciseNames } = useWorkoutHistory(user?.id);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const exerciseNames = getExerciseNames();
  const progressionData = selectedExercise ? getProgression(selectedExercise) : [];

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* ── Progression Chart ── */}
      <section className="flex flex-col gap-5 rounded-[34px] bg-primary p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <GraphUpBold size={28} color="currentColor" className="text-card" />
            <h2 className="text-2xl sm:text-4xl font-black uppercase text-card tracking-tight" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              Progressão de Carga
            </h2>
          </div>
        </div>

        {exerciseNames.length > 0 ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {exerciseNames.map((name) => (
                <Badge
                  key={name}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold shrink-0 transition-colors ${
                    selectedExercise === name
                      ? "bg-card text-primary border-0"
                      : "bg-card/20 text-card border-0 hover:bg-card/30"
                  }`}
                  onClick={() => setSelectedExercise(name)}
                >
                  {name}
                </Badge>
              ))}
            </div>

            {selectedExercise && progressionData.length > 0 ? (
              <div className="h-[200px] sm:h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,93%,0.1)" />
                    <XAxis dataKey="date" stroke="hsla(0,0%,93%,0.5)" fontSize={11} />
                    <YAxis stroke="hsla(0,0%,93%,0.5)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "hsl(120 5% 11%)", border: "none", borderRadius: "12px", color: "hsl(0 0% 93%)" }}
                      labelStyle={{ color: "hsl(10 99% 55%)" }}
                    />
                    <Line type="monotone" dataKey="maxWeight" stroke="hsl(0 0% 93%)" strokeWidth={3} dot={{ fill: "hsl(0 0% 93%)", r: 5 }} name="Carga Máx (kg)" />
                    <Line type="monotone" dataKey="totalVolume" stroke="hsla(0,0%,93%,0.4)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Volume Total" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : selectedExercise ? (
              <p className="text-card/60 text-sm">Nenhum dado de progressão para este exercício ainda.</p>
            ) : (
              <p className="text-card/60 text-sm">Selecione um exercício acima para ver a progressão.</p>
            )}
          </>
        ) : (
          <p className="text-card/60 text-sm">Complete treinos com cargas registradas para ver a progressão.</p>
        )}
      </section>

      {/* ── History List ── */}
      <section className="flex flex-col gap-5 rounded-[34px] bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
            Histórico de Treinos
          </h3>
          <HistoryBold size={28} color="currentColor" className="text-primary" />
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <DumbbellBold size={48} color="currentColor" className="text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum treino registrado ainda</p>
            <p className="text-muted-foreground text-sm">Complete treinos para vê-los aqui</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-muted/50 overflow-hidden">
                <button
                  className="flex items-center justify-between w-full p-4 sm:p-5 text-left"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                      <DumbbellBold size={20} color="currentColor" className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-bold text-card-foreground">{entry.workout_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        {entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}
                    >
                      <TrashBinTrashBold size={16} color="currentColor" />
                    </Button>
                    {expandedId === entry.id ? <AltArrowUpBold size={16} color="currentColor" className="text-muted-foreground" /> : <AltArrowDownBold size={16} color="currentColor" className="text-muted-foreground" />}
                  </div>
                </button>

                {expandedId === entry.id && entry.exercise_logs && entry.exercise_logs.length > 0 && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                    <div className="grid grid-cols-4 gap-2 text-xs font-bold text-muted-foreground mb-2 px-2">
                      <span>Exercício</span><span className="text-center">Série</span><span className="text-center">Reps</span><span className="text-center">Carga (kg)</span>
                    </div>
                    {entry.exercise_logs.map((log) => (
                      <div key={log.id} className="grid grid-cols-4 gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-background/50">
                        <span className="text-card-foreground truncate">{log.exercise_name}</span>
                        <span className="text-center text-muted-foreground">{log.set_number}</span>
                        <span className="text-center text-card-foreground">{log.reps}</span>
                        <span className="text-center font-bold text-primary">{log.weight_kg}</span>
                      </div>
                    ))}
                    {entry.notes && <p className="text-xs text-muted-foreground mt-3 italic">📝 {entry.notes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
