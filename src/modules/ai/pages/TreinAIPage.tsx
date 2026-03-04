import { useState, useRef, useEffect, useCallback } from "react";
import { useAIChat, parseWorkoutJson, parseAllWorkoutJsons, stripJsonTags } from "@/modules/ai/hooks/useAIChat";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BoltCircleBold, PlainBold, TrashBinTrashBold, DumbbellBold,
  DisketteBold, PenBold, AltArrowDownBold, AltArrowUpBold, ClockCircleBold, AddCircleBold, GalleryBold
} from "solar-icon-set";
import ReactMarkdown from "react-markdown";
import { RestTimer } from "@/modules/workouts/components/RestTimer";
import { Reorder } from "framer-motion";

const SUGGESTIONS = [
  "Monte um treino de peito e tríceps para hoje",
  "Preciso de um treino para pernas focado em hipertrofia",
  "Sugira um treino HIIT de 20 minutos",
  "Crie um plano semanal de treinos completo",
];

const DAY_LABELS_SHORT: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

const DAY_OPTIONS = [
  { value: "none", label: "Sem dia definido" },
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

interface SavedWorkout {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  duration_minutes: number | null;
  muscle_groups: string[] | null;
  day_of_week: number | null;
  exercises: SavedExercise[];
}

interface SavedExercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  sort_order: number | null;
}

interface NewExerciseForm {
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export default function TreinAIPage() {
  const { messages, isLoading, send, clear } = useAIChat("treinai");
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; exercise: SavedExercise | null }>({ open: false, exercise: null });
  const [editForm, setEditForm] = useState({ exercise_name: "", sets: 0, reps: 0, rest_seconds: 0 });
  const [restTimer, setRestTimer] = useState<{ seconds: number; name: string } | null>(null);

  // Create workout dialog state
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    difficulty: "beginner",
    duration_minutes: 60,
    day_of_week: "none" as string,
  });
  const [createExercises, setCreateExercises] = useState<NewExerciseForm[]>([
    { exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 },
  ]);
  const [creatingWorkout, setCreatingWorkout] = useState(false);

  // Edit workout dialog state
  const [editWorkoutDialog, setEditWorkoutDialog] = useState<{ open: boolean; workout: SavedWorkout | null }>({ open: false, workout: null });
  const [editWorkoutForm, setEditWorkoutForm] = useState({ name: "", description: "", difficulty: "beginner", duration_minutes: 60, day_of_week: "none" as string });

  // Add exercise to existing workout state
  const [addExerciseToWorkout, setAddExerciseToWorkout] = useState<string | null>(null);
  const [addExForm, setAddExForm] = useState<NewExerciseForm>({ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const fetchSavedWorkouts = useCallback(async () => {
    if (!user) return;
    const { data: workouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!workouts) return;

    const withExercises = await Promise.all(
      workouts.map(async (w) => {
        const { data: exercises } = await supabase
          .from("workout_exercises")
          .select("*")
          .eq("workout_id", w.id)
          .order("sort_order");
        return { ...w, exercises: (exercises || []) as SavedExercise[] } as SavedWorkout;
      })
    );
    setSavedWorkouts(withExercises);
  }, [user]);

  useEffect(() => { fetchSavedWorkouts(); }, [fetchSavedWorkouts]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    send(input.trim());
    setInput("");
  };

  const handleSaveWorkout = async (content: string) => {
    if (!user) return;
    const allWorkouts = parseAllWorkoutJsons(content);
    if (!allWorkouts || allWorkouts.length === 0) {
      toast.error("Não encontrei dados estruturados nesta resposta para salvar.");
      return;
    }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const parsed of allWorkouts) {
        const { data: workout, error } = await supabase
          .from("workouts")
          .insert({
            name: parsed.name,
            description: parsed.description || null,
            difficulty: parsed.difficulty || "beginner",
            duration_minutes: parsed.duration_minutes || 60,
            muscle_groups: parsed.muscle_groups || [],
            day_of_week: parsed.day_of_week ?? null,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (error || !workout) continue;

        if (parsed.exercises?.length) {
          await supabase.from("workout_exercises").insert(
            parsed.exercises.map((ex: any, i: number) => ({
              workout_id: workout.id,
              exercise_name: ex.exercise_name,
              sets: ex.sets || 3,
              reps: ex.reps || 12,
              rest_seconds: ex.rest_seconds || 60,
              sort_order: ex.sort_order || i + 1,
            }))
          );
        }
        savedCount++;
      }

      if (savedCount > 1) {
        toast.success(`${savedCount} treinos salvos com sucesso!`);
      } else {
        toast.success("Treino salvo com sucesso!");
      }
      fetchSavedWorkouts();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar treinos");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    await supabase.from("workouts").delete().eq("id", workoutId);
    toast.success("Treino excluído");
    fetchSavedWorkouts();
  };

  const openEditExercise = (ex: SavedExercise) => {
    setEditForm({ exercise_name: ex.exercise_name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds || 60 });
    setEditDialog({ open: true, exercise: ex });
  };

  const handleUpdateExercise = async () => {
    if (!editDialog.exercise) return;
    await supabase.from("workout_exercises").update({
      exercise_name: editForm.exercise_name,
      sets: editForm.sets,
      reps: editForm.reps,
      rest_seconds: editForm.rest_seconds,
    }).eq("id", editDialog.exercise.id);
    setEditDialog({ open: false, exercise: null });
    toast.success("Exercício atualizado");
    fetchSavedWorkouts();
  };

  const handleDeleteExercise = async (exId: string) => {
    await supabase.from("workout_exercises").delete().eq("id", exId);
    toast.success("Exercício removido");
    fetchSavedWorkouts();
  };

  // Update day_of_week for a workout
  const handleUpdateDayOfWeek = async (workoutId: string, dayValue: string) => {
    const day = dayValue === "none" ? null : parseInt(dayValue);
    await supabase.from("workouts").update({ day_of_week: day }).eq("id", workoutId);
    setSavedWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, day_of_week: day } : w))
    );
    toast.success("Dia atualizado");
  };

  // Open edit workout dialog
  const openEditWorkout = (w: SavedWorkout) => {
    setEditWorkoutForm({
      name: w.name,
      description: w.description || "",
      difficulty: w.difficulty || "beginner",
      duration_minutes: w.duration_minutes || 60,
      day_of_week: w.day_of_week != null ? String(w.day_of_week) : "none",
    });
    setEditWorkoutDialog({ open: true, workout: w });
  };

  const handleUpdateWorkout = async () => {
    if (!editWorkoutDialog.workout) return;
    const wId = editWorkoutDialog.workout.id;
    await supabase.from("workouts").update({
      name: editWorkoutForm.name,
      description: editWorkoutForm.description || null,
      difficulty: editWorkoutForm.difficulty,
      duration_minutes: editWorkoutForm.duration_minutes,
      day_of_week: editWorkoutForm.day_of_week === "none" ? null : parseInt(editWorkoutForm.day_of_week),
    }).eq("id", wId);
    setEditWorkoutDialog({ open: false, workout: null });
    toast.success("Treino atualizado");
    fetchSavedWorkouts();
  };

  // Create workout manually
  const handleCreateWorkout = async () => {
    if (!user || !createForm.name.trim()) {
      toast.error("Preencha o nome do treino");
      return;
    }
    const validExercises = createExercises.filter((ex) => ex.exercise_name.trim());
    if (validExercises.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }

    setCreatingWorkout(true);
    try {
      const { data: workout, error } = await supabase
        .from("workouts")
        .insert({
          name: createForm.name,
          description: createForm.description || null,
          difficulty: createForm.difficulty,
          duration_minutes: createForm.duration_minutes,
          day_of_week: createForm.day_of_week === "none" ? null : parseInt(createForm.day_of_week),
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error || !workout) throw error;

      await supabase.from("workout_exercises").insert(
        validExercises.map((ex, i) => ({
          workout_id: workout.id,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          sort_order: i + 1,
        }))
      );

      toast.success("Treino criado com sucesso!");
      setCreateDialog(false);
      setCreateForm({ name: "", description: "", difficulty: "beginner", duration_minutes: 60, day_of_week: "none" });
      setCreateExercises([{ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 }]);
      fetchSavedWorkouts();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar treino");
    } finally {
      setCreatingWorkout(false);
    }
  };

  const addExerciseRow = () => {
    setCreateExercises((prev) => [...prev, { exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 }]);
  };

  const removeExerciseRow = (idx: number) => {
    setCreateExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExerciseRow = (idx: number, field: keyof NewExerciseForm, value: string | number) => {
    setCreateExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex))
    );
  };

  const handleAddExerciseToWorkout = async (workoutId: string) => {
    if (!addExForm.exercise_name.trim()) {
      toast.error("Preencha o nome do exercício");
      return;
    }
    const workout = savedWorkouts.find((w) => w.id === workoutId);
    const nextOrder = (workout?.exercises.length || 0) + 1;
    const { error } = await supabase.from("workout_exercises").insert({
      workout_id: workoutId,
      exercise_name: addExForm.exercise_name,
      sets: addExForm.sets,
      reps: addExForm.reps,
      rest_seconds: addExForm.rest_seconds,
      sort_order: nextOrder,
    });
    if (error) {
      toast.error("Erro ao adicionar exercício");
      return;
    }
    toast.success("Exercício adicionado!");
    setAddExerciseToWorkout(null);
    setAddExForm({ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 });
    fetchSavedWorkouts();
  };

  const handleReorderExercises = async (workoutId: string, reordered: SavedExercise[]) => {
    setSavedWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, exercises: reordered } : w))
    );
    await Promise.all(
      reordered.map((ex, i) =>
        supabase.from("workout_exercises").update({ sort_order: i + 1 }).eq("id", ex.id)
      )
    );
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const canSave = lastAssistant && parseAllWorkoutJsons(lastAssistant.content) && !isLoading;
  const workoutCount = lastAssistant ? (parseAllWorkoutJsons(lastAssistant.content)?.length || 0) : 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <DumbbellBold size={24} color="currentColor" className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>TreinAI</h1>
              <p className="text-xs text-muted-foreground">Seu personal trainer inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialog(true)} className="rounded-xl text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground">
              <AddCircleBold size={16} color="currentColor" className="mr-1" /> Criar Treino
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
                <TrashBinTrashBold size={16} color="currentColor" className="mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Chat card (messages + input combined) */}
        <div className="rounded-[20px] sm:rounded-[28px] bg-card overflow-hidden flex flex-col">
          <div ref={scrollRef} className="h-[40vh] sm:h-[45vh] overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <BoltCircleBold size={40} color="currentColor" className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">Olá! Sou o TreinAI</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Já conheço seu perfil, lesões e objetivos. Me diga o que precisa e eu monto o treino ideal pra você!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="rounded-full bg-muted px-4 py-2 text-xs font-medium text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-card-foreground rounded-bl-md"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{stripJsonTags(msg.content)}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Pensando...
                </div>
              </div>
            )}
          </div>

          {/* Save button inline */}
          {canSave && (
            <div className="px-3 sm:px-6 pb-2">
              <Button onClick={() => handleSaveWorkout(lastAssistant!.content)} disabled={saving} className="rounded-2xl py-3 font-bold w-full">
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent mr-2" /> : <DisketteBold size={18} color="currentColor" className="mr-2" />}
                {workoutCount > 1 ? `Salvar ${workoutCount} Treinos` : "Salvar Treino Gerado"}
              </Button>
            </div>
          )}

          {/* Input inside card */}
          <div className="flex gap-2 px-3 sm:px-6 pb-3 sm:pb-6 pt-2 border-t border-border/30">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Descreva o treino que você precisa..."
              className="flex-1 rounded-xl bg-muted/50 px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isLoading}
            />
            <label className="flex items-center justify-center h-auto px-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors" title="Galeria">
              <GalleryBold size={20} color="currentColor" className="text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setInput(`[Imagem anexada: ${file.name}] Analise esta imagem e crie um treino ou avaliação corporal baseado nela.`);
                }
                e.target.value = "";
              }} />
            </label>
            <label className="flex items-center justify-center h-auto px-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors" title="Câmera">
              <span className="text-base">📷</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setInput(`[Foto da câmera: ${file.name}] Analise esta foto e crie um treino ou avaliação corporal baseado nela.`);
                }
                e.target.value = "";
              }} />
            </label>
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl h-auto px-4">
              <PlainBold size={20} color="currentColor" />
            </Button>
          </div>
        </div>

        {/* Saved Workouts */}
        {savedWorkouts.length > 0 && (
          <section className="rounded-[20px] sm:rounded-[28px] bg-card p-3 sm:p-6">
            <h3 className="text-xl font-black text-card-foreground mb-4" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              Meus Treinos Salvos
            </h3>
            <div className="space-y-3">
              {savedWorkouts.map((w) => {
                const isExpanded = expandedWorkout === w.id;
                return (
                  <div key={w.id} className="rounded-2xl bg-muted/50 overflow-hidden">
                    <button onClick={() => setExpandedWorkout(isExpanded ? null : w.id)} className="flex items-center justify-between w-full px-5 py-4 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <DumbbellBold size={20} color="currentColor" className="text-primary shrink-0" />
                        <div className="text-left">
                          <h4 className="text-sm font-bold text-card-foreground">{w.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {w.day_of_week != null && <span className="text-primary font-semibold">{DAY_LABELS_SHORT[w.day_of_week]} · </span>}
                            {w.exercises.length} exercícios · {w.duration_minutes || 60} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openEditWorkout(w); }} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                          <PenBold size={16} color="currentColor" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(w.id); }} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                          <TrashBinTrashBold size={16} color="currentColor" />
                        </button>
                        {isExpanded ? <AltArrowUpBold size={14} color="currentColor" className="text-muted-foreground" /> : <AltArrowDownBold size={14} color="currentColor" className="text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-2">
                        {/* Day selector inline */}
                        <div className="flex items-center gap-2 pb-2">
                          <span className="text-xs font-medium text-muted-foreground">Dia:</span>
                          <Select value={w.day_of_week != null ? String(w.day_of_week) : "none"} onValueChange={(v) => handleUpdateDayOfWeek(w.id, v)}>
                            <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs bg-card border-muted">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAY_OPTIONS.map((d) => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Reorder.Group axis="y" values={w.exercises} onReorder={(reordered) => handleReorderExercises(w.id, reordered)} className="space-y-2">
                          {w.exercises.map((ex) => (
                            <Reorder.Item key={ex.id} value={ex} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5 cursor-grab active:cursor-grabbing active:shadow-lg active:z-10">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="text-muted-foreground shrink-0 touch-none">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="2" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="9" cy="18" r="2" /><circle cx="15" cy="18" r="2" /></svg>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-semibold text-card-foreground truncate">{ex.exercise_name}</span>
                                  <span className="text-xs text-muted-foreground">{ex.sets}×{ex.reps} · ⏱️ {ex.rest_seconds || 60}s</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => setRestTimer({ seconds: ex.rest_seconds || 60, name: ex.exercise_name })} className="text-primary hover:text-primary/80 p-1.5 transition-colors" title="Timer de descanso">
                                  <ClockCircleBold size={16} color="currentColor" />
                                </button>
                                <button onClick={() => openEditExercise(ex)} className="text-muted-foreground hover:text-foreground p-1.5 transition-colors">
                                  <PenBold size={14} color="currentColor" />
                                </button>
                                <button onClick={() => handleDeleteExercise(ex.id)} className="text-muted-foreground hover:text-destructive p-1.5 transition-colors">
                                  <TrashBinTrashBold size={14} color="currentColor" />
                                </button>
                              </div>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                        {/* Add exercise inline */}
                        {addExerciseToWorkout === w.id ? (
                          <div className="rounded-xl bg-card p-3 space-y-2 border border-primary/20">
                            <Input
                              value={addExForm.exercise_name}
                              onChange={(e) => setAddExForm({ ...addExForm, exercise_name: e.target.value })}
                              placeholder="Nome do exercício"
                              className="h-9 text-sm"
                              autoFocus
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Séries</label>
                                <Input type="number" value={addExForm.sets} onChange={(e) => setAddExForm({ ...addExForm, sets: +e.target.value })} className="h-8 text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Reps</label>
                                <Input type="number" value={addExForm.reps} onChange={(e) => setAddExForm({ ...addExForm, reps: +e.target.value })} className="h-8 text-xs" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground">Descanso (s)</label>
                                <Input type="number" value={addExForm.rest_seconds} onChange={(e) => setAddExForm({ ...addExForm, rest_seconds: +e.target.value })} className="h-8 text-xs" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddExerciseToWorkout(w.id)} className="rounded-lg flex-1 h-8 text-xs">
                                <AddCircleBold size={14} color="currentColor" className="mr-1" /> Adicionar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setAddExerciseToWorkout(null); setAddExForm({ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 }); }} className="rounded-lg h-8 text-xs">
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddExerciseToWorkout(w.id); setAddExForm({ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 }); }}
                            className="flex items-center gap-2 w-full rounded-xl border border-dashed border-primary/30 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                          >
                            <AddCircleBold size={16} color="currentColor" /> Adicionar exercício
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Rest Timer Modal */}
      {restTimer && (
        <RestTimer seconds={restTimer.seconds} exerciseName={restTimer.name} onClose={() => setRestTimer(null)} />
      )}

      {/* Edit Exercise Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, exercise: null })}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Editar Exercício</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input value={editForm.exercise_name} onChange={(e) => setEditForm({ ...editForm, exercise_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Séries</label>
                <Input type="number" value={editForm.sets} onChange={(e) => setEditForm({ ...editForm, sets: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Reps</label>
                <Input type="number" value={editForm.reps} onChange={(e) => setEditForm({ ...editForm, reps: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Descanso (s)</label>
                <Input type="number" value={editForm.rest_seconds} onChange={(e) => setEditForm({ ...editForm, rest_seconds: +e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateExercise} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workout Dialog */}
      <Dialog open={editWorkoutDialog.open} onOpenChange={(open) => !open && setEditWorkoutDialog({ open: false, workout: null })}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Editar Treino</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input value={editWorkoutForm.name} onChange={(e) => setEditWorkoutForm({ ...editWorkoutForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Input value={editWorkoutForm.description} onChange={(e) => setEditWorkoutForm({ ...editWorkoutForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Dificuldade</label>
                <Select value={editWorkoutForm.difficulty} onValueChange={(v) => setEditWorkoutForm({ ...editWorkoutForm, difficulty: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Duração (min)</label>
                <Input type="number" value={editWorkoutForm.duration_minutes} onChange={(e) => setEditWorkoutForm({ ...editWorkoutForm, duration_minutes: +e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Dia da Semana</label>
              <Select value={editWorkoutForm.day_of_week} onValueChange={(v) => setEditWorkoutForm({ ...editWorkoutForm, day_of_week: v })}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateWorkout} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Workout Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="rounded-[20px] max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Criar Treino Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nome do Treino *</label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Ex: Treino A - Push" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrição</label>
              <Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Descrição breve (opcional)" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Dificuldade</label>
                <Select value={createForm.difficulty} onValueChange={(v) => setCreateForm({ ...createForm, difficulty: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Duração</label>
                <Input type="number" value={createForm.duration_minutes} onChange={(e) => setCreateForm({ ...createForm, duration_minutes: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Dia</label>
                <Select value={createForm.day_of_week} onValueChange={(v) => setCreateForm({ ...createForm, day_of_week: v })}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-foreground">Exercícios</label>
                <Button variant="ghost" size="sm" onClick={addExerciseRow} className="text-primary text-xs h-7">
                  <AddCircleBold size={14} color="currentColor" className="mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {createExercises.map((ex, idx) => (
                  <div key={idx} className="rounded-xl bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={ex.exercise_name}
                        onChange={(e) => updateExerciseRow(idx, "exercise_name", e.target.value)}
                        placeholder={`Exercício ${idx + 1}`}
                        className="flex-1 h-9 text-sm"
                      />
                      {createExercises.length > 1 && (
                        <button onClick={() => removeExerciseRow(idx)} className="text-muted-foreground hover:text-destructive p-1">
                          <TrashBinTrashBold size={14} color="currentColor" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Séries</label>
                        <Input type="number" value={ex.sets} onChange={(e) => updateExerciseRow(idx, "sets", +e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Reps</label>
                        <Input type="number" value={ex.reps} onChange={(e) => updateExerciseRow(idx, "reps", +e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Descanso (s)</label>
                        <Input type="number" value={ex.rest_seconds} onChange={(e) => updateExerciseRow(idx, "rest_seconds", +e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateWorkout} disabled={creatingWorkout} className="rounded-xl w-full">
              {creatingWorkout ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent mr-2" /> : <DisketteBold size={16} color="currentColor" className="mr-2" />}
              Criar Treino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
