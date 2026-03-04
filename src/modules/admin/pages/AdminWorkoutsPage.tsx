import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useAdminWorkouts, type AdminWorkout } from "../hooks/useAdminWorkouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DumbbellBold,
  AddCircleBold,
  CloseCircleBold,
  PenBold,
  TrashBinTrashBold,
} from "solar-icon-set";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const dayLabels: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado",
};

interface ExerciseForm {
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
}

interface WorkoutForm {
  name: string;
  description: string;
  day_of_week: string;
  difficulty: string;
  is_shared: boolean;
  muscle_groups: string;
  exercises: ExerciseForm[];
}

const emptyExercise = (): ExerciseForm => ({ exercise_name: "", sets: 3, reps: 12, rest_seconds: 60 });

const emptyForm = (): WorkoutForm => ({
  name: "",
  description: "",
  day_of_week: "none",
  difficulty: "beginner",
  is_shared: true,
  muscle_groups: "",
  exercises: [emptyExercise()],
});

function formFromWorkout(w: AdminWorkout): WorkoutForm {
  return {
    name: w.name,
    description: w.description || "",
    day_of_week: w.day_of_week != null ? String(w.day_of_week) : "none",
    difficulty: w.difficulty || "beginner",
    is_shared: w.is_shared,
    muscle_groups: (w.muscle_groups || []).join(", "),
    exercises: w.exercises.length > 0
      ? w.exercises.map((ex) => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds ?? 60,
        }))
      : [emptyExercise()],
  };
}

export default function AdminWorkoutsPage() {
  const { user } = useAuth();
  const { workouts, loading, addWorkout, updateWorkout, deleteWorkout } = useAdminWorkouts();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkoutForm>(emptyForm());

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEdit = (w: AdminWorkout) => {
    setEditingId(w.id);
    setForm(formFromWorkout(w));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !user) return;
    const validExercises = form.exercises.filter((ex) => ex.exercise_name.trim());
    if (validExercises.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }

    const workoutData = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      day_of_week: form.day_of_week === "none" ? null : Number(form.day_of_week),
      difficulty: form.difficulty,
      is_shared: form.is_shared,
      muscle_groups: form.muscle_groups.split(",").map((s) => s.trim()).filter(Boolean),
    };

    if (editingId) {
      const { error } = await updateWorkout(editingId, workoutData, validExercises);
      if (error) {
        toast.error("Erro ao atualizar treino");
      } else {
        toast.success("Treino atualizado!");
        setShowDialog(false);
      }
    } else {
      const { error } = await addWorkout(workoutData, validExercises, user.id);
      if (error) {
        toast.error("Erro ao criar treino");
      } else {
        toast.success("Treino criado!");
        setShowDialog(false);
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    await deleteWorkout(id);
    toast.success(`"${name}" removido`);
  };

  const updateExercise = (idx: number, field: keyof ExerciseForm, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex)),
    }));
  };

  const addExercise = () => setForm((prev) => ({ ...prev, exercises: [...prev.exercises, emptyExercise()] }));
  const removeExercise = (idx: number) => setForm((prev) => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-6 max-w-3xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Treinos</h1>
          <p className="text-sm text-muted-foreground">{workouts.length} treino(s) na base de dados</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl gap-2">
          <AddCircleBold size={18} color="currentColor" />
          Novo Treino
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
            <DumbbellBold size={48} color="currentColor" />
            <p className="text-base font-semibold">Nenhum treino cadastrado</p>
          </div>
        ) : (
          workouts.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-[16px] bg-card p-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <DumbbellBold size={24} color="currentColor" className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate">{w.name}</p>
                  {w.is_shared && (
                    <span className="text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                      GLOBAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {w.exercises.length} exercício(s)
                  {w.day_of_week != null && ` · ${dayLabels[w.day_of_week]}`}
                  {w.difficulty && ` · ${w.difficulty}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(w)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors"
                >
                  <PenBold size={16} color="currentColor" />
                </button>
                <button
                  onClick={() => handleDelete(w.id, w.name)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                >
                  <TrashBinTrashBold size={16} color="currentColor" />
                </button>
              </div>
            </div>
          ))
        )}
      </motion.div>

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Treino" : "Novo Treino (Base de Dados)"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os detalhes do treino" : "Crie um treino global que aparecerá para todos os usuários"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do Treino</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Treino A - Peito e Tríceps" />
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve descrição (opcional)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Dia da Semana</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem dia fixo</SelectItem>
                    {Object.entries(dayLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Dificuldade</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Grupos Musculares (separados por vírgula)</Label>
              <Input value={form.muscle_groups} onChange={(e) => setForm({ ...form, muscle_groups: e.target.value })} placeholder="Peito, Tríceps, Ombros..." />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_shared} onCheckedChange={(v) => setForm({ ...form, is_shared: v })} />
              <Label className="text-sm">Treino Global (visível para todos)</Label>
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Exercícios ({form.exercises.length})</Label>
                <button onClick={addExercise} className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80">
                  <AddCircleBold size={16} color="currentColor" />
                  Adicionar
                </button>
              </div>

              {form.exercises.map((ex, idx) => (
                <div key={idx} className="rounded-xl bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <Input
                      value={ex.exercise_name}
                      onChange={(e) => updateExercise(idx, "exercise_name", e.target.value)}
                      placeholder={`Exercício ${idx + 1}`}
                      className="flex-1 text-sm"
                    />
                    {form.exercises.length > 1 && (
                      <button onClick={() => removeExercise(idx)} className="text-muted-foreground hover:text-destructive">
                        <CloseCircleBold size={16} color="currentColor" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Séries</span>
                      <Input type="number" min={1} value={ex.sets} onChange={(e) => updateExercise(idx, "sets", Math.max(1, Number(e.target.value)))} className="text-sm text-center h-8" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Reps</span>
                      <Input type="number" min={1} value={ex.reps} onChange={(e) => updateExercise(idx, "reps", Math.max(1, Number(e.target.value)))} className="text-sm text-center h-8" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground">Descanso (s)</span>
                      <Input type="number" min={0} step={5} value={ex.rest_seconds} onChange={(e) => updateExercise(idx, "rest_seconds", Math.max(0, Number(e.target.value)))} className="text-sm text-center h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editingId ? "Salvar Alterações" : "Criar Treino"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
