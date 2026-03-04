import { useState, useRef } from "react";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DumbbellBold,
  PlayBold,
  AltArrowRightBold,
  BoltCircleBold,
  ClockCircleBold,
  AddCircleBold,
  GraphUpBold,
  HistoryBold,
  TrashBinTrashBold,
  AltArrowDownBold,
  AltArrowUpBold,
  ShareBold,
  RunningBold,
  PenBold,
  CopyBold,
  AltArrowLeftBold,
} from "solar-icon-set";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import CardioTracker from "@/modules/workouts/components/CardioTracker";
import { CreateEditWorkoutDialog, type LocalWorkout } from "@/modules/workouts/components/CreateEditWorkoutDialog";
import ExerciseLibrary from "@/modules/workouts/components/ExerciseLibrary";
import ActiveWorkoutView from "@/modules/workouts/components/ActiveWorkoutView";
import { useWorkoutTracker } from "@/modules/workouts/hooks/useWorkoutTracker";
import { toast } from "sonner";
import { DAY_LABELS_FULL, type Exercise } from "@/lib/types";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } } };

export default function WorkoutsPage() {
  const wt = useWorkoutTracker();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<LocalWorkout | null>(null);
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"treinos" | "biblioteca">("treinos");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: string) => setSectionsOpen((p) => ({ ...p, [key]: !p[key] }));

  // ─── Active Workout Mode ───
  if (wt.activeWorkout) {
    return (
      <ActiveWorkoutView
        activeWorkout={wt.activeWorkout}
        trackers={wt.trackers}
        startTime={wt.startTime}
        saving={wt.saving}
        completedSets={wt.completedSets}
        totalSets={wt.totalSets}
        restTimer={wt.restTimer}
        onSetRestTimer={wt.setRestTimer}
        onUpdateSet={wt.updateSet}
        onToggleSetComplete={wt.toggleSetComplete}
        onCancel={wt.cancelWorkout}
        onFinish={wt.finishWorkout}
      />
    );
  }

  // ─── Default View ───
  return (
    <>
      {/* Tab pills */}
      <div className="flex gap-2 mb-4 max-w-6xl mx-auto">
        <Badge
          className={`cursor-pointer rounded-full px-5 py-2 text-sm font-bold transition-colors border ${activeTab === "treinos"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
          onClick={() => setActiveTab("treinos")}
        >
          <DumbbellBold size={14} color="currentColor" className="mr-1.5" />
          Meus Treinos
        </Badge>
        <Badge
          className={`cursor-pointer rounded-full px-5 py-2 text-sm font-bold transition-colors border ${activeTab === "biblioteca"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
          onClick={() => setActiveTab("biblioteca")}
        >
          <Search size={14} className="mr-1.5" />
          Biblioteca de Exercícios
        </Badge>
      </div>

      {activeTab === "biblioteca" ? (
        <div className="max-w-6xl mx-auto">
          <ExerciseLibrary />
        </div>
      ) : (
        <motion.div className="flex flex-col gap-4 sm:gap-6 max-w-6xl mx-auto" variants={stagger} initial="hidden" animate="show">
          {/* ── Today's Workout ── */}
          <motion.div variants={fadeUp}>
            <section className="relative flex flex-col gap-4 sm:gap-5 rounded-[20px] sm:rounded-[34px] bg-primary p-4 sm:p-8 lg:p-10 overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <Badge className="bg-primary-foreground text-primary border-0 rounded-full px-4 py-1.5 text-xs font-bold">
                  Treino do Dia
                </Badge>
                <Button
                  variant="outline"
                  className="rounded-full border-white/20 text-primary bg-white hover:bg-white/90 font-bold px-6"
                  onClick={() => wt.todayWorkout && wt.startWorkout(wt.todayWorkout, wt.todayExercises)}
                  disabled={!wt.todayWorkout || wt.todayExercises.length === 0}
                >
                  <PlayBold size={14} color="currentColor" className="mr-2" />
                  Começar Treino
                </Button>
              </div>

              <h2
                className="text-xl sm:text-3xl lg:text-5xl uppercase leading-tight tracking-tight text-primary-foreground font-black break-words"
                style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}
              >
                {wt.todayWorkout?.name || "Sem treino hoje"}
              </h2>

              {wt.todayExercises.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                  {wt.todayExercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex flex-col justify-between min-w-[160px] h-[180px] rounded-2xl bg-primary-foreground/15 backdrop-blur-sm p-4 shrink-0 cursor-pointer hover:bg-primary-foreground/25 transition-all hover-scale"
                      onClick={() => wt.setRestTimer({ seconds: ex.rest_seconds || 60, name: ex.exercise_name })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground text-primary">
                          <PlayBold size={14} color="currentColor" />
                        </div>
                        <div className="flex items-center gap-1 text-primary-foreground/70">
                          <ClockCircleBold size={12} color="currentColor" />
                          <span className="text-[10px]">{ex.rest_seconds || 60}s</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary-foreground leading-tight line-clamp-2">{ex.exercise_name}</p>
                        <p className="text-xs text-primary-foreground/70 mt-1">{ex.reps} Reps · {ex.sets}x</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {wt.todayExercises.length > 0 && (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-primary-foreground/70">
                    <ClockCircleBold size={12} color="currentColor" className="inline mr-1" />
                    Tempo estimado: {Math.round(wt.todayExercises.reduce((sum, ex) => sum + (ex.sets * 45) + ((ex.sets - 1) * (ex.rest_seconds || 60)), 0) / 60)} min
                  </p>
                  <p className="text-xs text-primary-foreground/60">
                    Clique em "Começar Treino" para registrar suas cargas.
                  </p>
                </div>
              )}
            </section>
          </motion.div>

          {/* ── Workouts Grid + TreinAI ── */}
          <motion.div variants={fadeUp}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              <section className="lg:col-span-3 flex flex-col gap-4 sm:gap-5 rounded-[20px] sm:rounded-[34px] bg-card p-4 sm:p-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                    Meus treinos
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-full px-4 font-bold"
                      onClick={() => { setEditingWorkout(null); setDialogOpen(true); }}
                    >
                      <AddCircleBold size={16} color="currentColor" className="mr-1" />
                      Criar
                    </Button>
                    <DumbbellBold size={28} color="currentColor" className="text-primary" />
                  </div>
                </div>

                {wt.workouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <DumbbellBold size={48} color="currentColor" className="text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum treino cadastrado ainda</p>
                    <Button
                      className="rounded-full px-6 font-bold"
                      onClick={() => { setEditingWorkout(null); setDialogOpen(true); }}
                    >
                      <AddCircleBold size={16} color="currentColor" className="mr-1" />
                      Criar meu primeiro treino
                    </Button>
                  </div>
                ) : (() => {
                  const scroll = (dir: number) => {
                    carouselRef.current?.scrollBy({ left: dir * 370, behavior: "smooth" });
                  };

                  return (
                    <div className="relative">
                      {/* Left arrow */}
                      <button
                        onClick={() => scroll(-1)}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border/40 text-muted-foreground hover:text-foreground transition-all"
                      >
                        <AltArrowLeftBold size={16} color="currentColor" />
                      </button>

                      <div ref={carouselRef} className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
                        {wt.workouts.map((w, i) => {
                          const exercises = (w as any)._exercises || [];
                          const estMinutes = exercises.length > 0
                            ? Math.round(exercises.reduce((sum: number, ex: any) => sum + ((ex.sets || 3) * 45) + (((ex.sets || 3) - 1) * (ex.rest_seconds || 60)), 0) / 60)
                            : null;

                          return (
                            <div
                              key={w.id}
                              className="relative flex flex-col justify-between min-w-[170px] max-w-[200px] h-[210px] rounded-2xl bg-muted/50 p-5 shrink-0 snap-start group cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                              onClick={async () => {
                                if (w._isLocal) {
                                  wt.handleStartLocalWorkout(w);
                                } else {
                                  const { data } = await supabase
                                    .from("workout_exercises")
                                    .select("*")
                                    .eq("workout_id", w.id)
                                    .order("sort_order");
                                  if (data && data.length > 0) wt.startWorkout(w, data as Exercise[]);
                                  else toast.error("Este treino não tem exercícios cadastrados");
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                                  <DumbbellBold size={20} color="currentColor" className="text-primary" />
                                </div>
                                <div className="flex items-center gap-1">
                                  {w._isLocal ? (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); const local = wt.handleEditLocal(w); if (local) { setEditingWorkout(local); setDialogOpen(true); } }} className="h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar"><PenBold size={12} color="currentColor" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); wt.handleDeleteLocal(w); }} className="h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-destructive transition-colors" title="Excluir"><TrashBinTrashBold size={12} color="currentColor" /></button>
                                    </>
                                  ) : w.user_id === wt.user?.id ? (
                                    <>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          const newVal = !w.is_shared;
                                          await supabase.from("workouts").update({ is_shared: newVal }).eq("id", w.id);
                                          wt.setWorkouts((prev) => prev.map((wk) => wk.id === w.id ? { ...wk, is_shared: newVal } : wk));
                                          toast.success(newVal ? "Treino compartilhado!" : "Treino tornado privado");
                                        }}
                                        className={`h-7 w-7 rounded-full flex items-center justify-center transition-colors ${w.is_shared ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                                        title={w.is_shared ? "Compartilhado" : "Compartilhar"}
                                      >
                                        <ShareBold size={12} color="currentColor" />
                                      </button>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!window.confirm("Excluir este treino?")) return;
                                          await supabase.from("workout_exercises").delete().eq("workout_id", w.id);
                                          await supabase.from("workout_bookmarks").delete().eq("workout_id", w.id);
                                          await supabase.from("workouts").delete().eq("id", w.id);
                                          wt.setWorkouts((prev) => prev.filter((wk) => wk.id !== w.id));
                                          toast.success("Treino excluído!");
                                        }}
                                        className="h-7 w-7 rounded-full flex items-center justify-center bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                        title="Excluir"
                                      >
                                        <TrashBinTrashBold size={12} color="currentColor" />
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <div>
                                <p className="text-base font-bold text-card-foreground leading-tight line-clamp-2">{w.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {w.day_of_week != null ? DAY_LABELS_FULL[w.day_of_week] : DAY_LABELS_FULL[i % 7]}
                                  {w._isLocal && <span className="ml-1 text-primary">(local)</span>}
                                </p>
                                {estMinutes && (
                                  <p className="text-[10px] text-primary mt-1 font-bold">
                                    <ClockCircleBold size={10} color="currentColor" className="inline mr-0.5" />
                                    {estMinutes} min
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right arrow */}
                      <button
                        onClick={() => scroll(1)}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border/40 text-muted-foreground hover:text-foreground transition-all"
                      >
                        <AltArrowRightBold size={16} color="currentColor" />
                      </button>
                    </div>
                  );
                })()}
              </section>

              <section className="lg:col-span-2 flex flex-col gap-4 rounded-[20px] sm:rounded-[34px] bg-card p-4 sm:p-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                    TreinAI
                  </h3>
                  <BoltCircleBold size={24} color="currentColor" className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Gere treinos personalizados com inteligência artificial</p>
                <Button
                  className="rounded-2xl py-5 text-base font-black w-full"
                  onClick={() => window.location.href = '/ai-trainer'}
                >
                  <BoltCircleBold size={18} color="currentColor" className="mr-2" />
                  Abrir TreinAI
                </Button>
              </section>
            </div>
          </motion.div>

          {/* ── Progression Chart — collapsible ── */}
          <motion.div variants={fadeUp}>
            <section className="flex flex-col rounded-[20px] sm:rounded-[34px] bg-primary overflow-hidden">
              <button className="flex items-center justify-between w-full p-4 sm:p-8 lg:p-10 text-left" onClick={() => toggleSection("progression")}>
                <div className="flex items-center gap-3">
                  <GraphUpBold size={28} color="currentColor" className="text-primary-foreground" />
                  <h2 className="text-xl sm:text-2xl lg:text-4xl font-black uppercase text-primary-foreground tracking-tight leading-tight break-words" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                    Progressão de Carga
                  </h2>
                </div>
                <div className="shrink-0 ml-2 text-primary-foreground/60">
                  {sectionsOpen["progression"] ? <AltArrowUpBold size={20} color="currentColor" /> : <AltArrowDownBold size={20} color="currentColor" />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {sectionsOpen["progression"] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                    <div className="px-4 sm:px-8 lg:px-10 pb-4 sm:pb-8 lg:pb-10">
                      {wt.getExerciseNames().length > 0 ? (
                        <>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {wt.getExerciseNames().map((name) => (
                              <Badge key={name} className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold shrink-0 transition-colors ${selectedExercise === name ? "bg-primary-foreground text-primary border-0" : "bg-primary-foreground/20 text-primary-foreground border-0 hover:bg-primary-foreground/30"}`} onClick={() => setSelectedExercise(name)}>
                                {name}
                              </Badge>
                            ))}
                          </div>
                          {selectedExercise && wt.getProgression(selectedExercise).length > 0 ? (
                            <div className="h-[200px] sm:h-[250px] w-full mt-4">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={wt.getProgression(selectedExercise)}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(0,0%,100%,0.15)" />
                                  <XAxis dataKey="date" stroke="hsla(0,0%,100%,0.5)" fontSize={11} />
                                  <YAxis stroke="hsla(0,0%,100%,0.5)" fontSize={11} />
                                  <Tooltip contentStyle={{ background: "hsl(120 5% 11%)", border: "none", borderRadius: "12px", color: "hsl(0 0% 100%)" }} labelStyle={{ color: "hsl(10 99% 55%)" }} />
                                  <Line type="monotone" dataKey="maxWeight" stroke="hsl(0 0% 100%)" strokeWidth={3} dot={{ fill: "hsl(0 0% 100%)", r: 5 }} name="Carga Máx (kg)" />
                                  <Line type="monotone" dataKey="totalVolume" stroke="hsla(0,0%,100%,0.4)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Volume Total" />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : selectedExercise ? (
                            <p className="text-primary-foreground/60 text-sm mt-4">Nenhum dado de progressão para este exercício ainda.</p>
                          ) : (
                            <p className="text-primary-foreground/60 text-sm mt-4">Selecione um exercício acima para ver a progressão.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-primary-foreground/60 text-sm">Complete treinos com cargas registradas para ver a progressão.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>

          {/* ── Cardio — collapsible ── */}
          <motion.div variants={fadeUp}>
            <section className="flex flex-col rounded-[20px] sm:rounded-[34px] bg-card overflow-hidden">
              <button className="flex items-center justify-between w-full p-4 sm:p-8 text-left" onClick={() => toggleSection("cardio")}>
                <div className="flex items-center gap-3">
                  <RunningBold size={28} color="currentColor" className="text-primary" />
                  <h2 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Cardio</h2>
                </div>
                <div className="shrink-0 ml-2 text-muted-foreground">
                  {sectionsOpen["cardio"] ? <AltArrowUpBold size={20} color="currentColor" /> : <AltArrowDownBold size={20} color="currentColor" />}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {sectionsOpen["cardio"] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                    <div className="px-4 sm:px-8 pb-4 sm:pb-8"><CardioTracker /></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>

          {/* ── History — collapsible ── */}
          <motion.div variants={fadeUp}>
            <section className="flex flex-col rounded-[20px] sm:rounded-[34px] bg-card overflow-hidden">
              <button className="flex items-center justify-between w-full p-4 sm:p-8 text-left" onClick={() => toggleSection("history")}>
                <div className="flex items-center gap-3">
                  <HistoryBold size={28} color="currentColor" className="text-primary" />
                  <h3 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Histórico de Treinos</h3>
                </div>
                <div className="shrink-0 ml-2 text-muted-foreground">
                  {sectionsOpen["history"] ? <AltArrowUpBold size={20} color="currentColor" /> : <AltArrowDownBold size={20} color="currentColor" />}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {sectionsOpen["history"] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
                    <div className="px-4 sm:px-8 pb-4 sm:pb-8">
                      {wt.history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                          <DumbbellBold size={48} color="currentColor" className="text-muted-foreground" />
                          <p className="text-muted-foreground">Nenhum treino registrado ainda</p>
                          <p className="text-muted-foreground text-sm">Complete treinos para vê-los aqui</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {wt.history.map((entry) => (
                            <div key={entry.id} className="rounded-2xl bg-muted/50 overflow-hidden">
                              <button className="flex items-center justify-between w-full p-4 sm:p-5 text-left" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
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
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); wt.deleteEntry(entry.id); }}>
                                    <TrashBinTrashBold size={16} color="currentColor" />
                                  </Button>
                                  {expandedId === entry.id ? <AltArrowUpBold size={16} color="currentColor" className="text-muted-foreground" /> : <AltArrowDownBold size={16} color="currentColor" className="text-muted-foreground" />}
                                </div>
                              </button>
                              {expandedId === entry.id && entry.exercise_logs && entry.exercise_logs.length > 0 && (
                                <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                                  <div className="grid grid-cols-4 gap-1 sm:gap-2 text-[10px] sm:text-xs font-bold text-muted-foreground mb-2 px-1 sm:px-2">
                                    <span className="truncate">Exercício</span><span className="text-center">Série</span><span className="text-center">Reps</span><span className="text-center">Carga</span>
                                  </div>
                                  {entry.exercise_logs.map((log) => (
                                    <div key={log.id} className="grid grid-cols-4 gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 px-1 sm:px-2 rounded-lg hover:bg-background/50">
                                      <span className="text-card-foreground truncate text-[11px] sm:text-sm">{log.exercise_name}</span>
                                      <span className="text-center text-muted-foreground">{log.set_number}</span>
                                      <span className="text-center text-card-foreground">{log.reps}</span>
                                      <span className="text-center font-bold text-primary">{log.weight_kg}</span>
                                    </div>
                                  ))}
                                  {entry.notes && <p className="text-xs text-muted-foreground mt-3 italic">{entry.notes}</p>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        </motion.div>
      )}

      {wt.restTimer && (
        <RestTimer seconds={wt.restTimer.seconds} exerciseName={wt.restTimer.name} onClose={() => wt.setRestTimer(null)} />
      )}

      <CreateEditWorkoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editWorkout={editingWorkout}
        onSaved={wt.loadAllWorkouts}
      />
    </>
  );
}

// Import RestTimer for use in default view
import { RestTimer } from "@/modules/workouts/components/RestTimer";
