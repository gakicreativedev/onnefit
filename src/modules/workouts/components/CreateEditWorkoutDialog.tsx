import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddCircleBold, TrashBinTrashBold, AltArrowUpBold, AltArrowDownBold, CopyBold, VideocameraAddBold } from "solar-icon-set";
import { Search } from "lucide-react";
import { toast } from "sonner";

const dayLabels: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-Feira",
  2: "Terça-Feira",
  3: "Quarta-Feira",
  4: "Quinta-Feira",
  5: "Sexta-Feira",
  6: "Sábado",
};

export interface LocalExercise {
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  media_url?: string;
}

export interface LocalWorkout {
  id: string;
  name: string;
  day_of_week: number | null;
  exercises: LocalExercise[];
}

const STORAGE_KEY = "fitsoul_local_workouts";

export function loadLocalWorkouts(): LocalWorkout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalWorkouts(workouts: LocalWorkout[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function duplicateLocalWorkout(workoutId: string): LocalWorkout | null {
  const all = loadLocalWorkouts();
  const original = all.find((w) => w.id === workoutId);
  if (!original) return null;
  const copy: LocalWorkout = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${original.name} (cópia)`,
    day_of_week: null,
    exercises: original.exercises.map((ex) => ({ ...ex })),
  };
  saveLocalWorkouts([...all, copy]);
  return copy;
}

const emptyExercise = (): LocalExercise => ({
  exercise_name: "",
  sets: 3,
  reps: 12,
  rest_seconds: 60,
  media_url: "",
});

// ─── Rest seconds by category (mid-range of each bracket) ───
const REST_SECONDS_MAP: Record<string, number> = {
  "Abs": 35, "Calves": 35, "Abdominais": 35, "Panturrilhas": 35,
  "Arms": 75, "Chest": 75, "Shoulders": 75,
  "Braços": 75, "Peito": 75, "Ombros": 75, "Bíceps": 75, "Tríceps": 75,
  "Back": 105, "Legs": 105, "Costas": 105, "Pernas": 105, "Glúteos": 105,
};

function getRestSecondsForCategory(categoryName: string): number {
  return REST_SECONDS_MAP[categoryName] ?? 60;
}

// ─── Wger API types (minimal) ───
interface WgerSuggestion {
  name: string;
  nameEn: string;
  category: string;
  image: string | null;
  restSeconds: number;
}

// ─── Exercise Name Search Input with API autocomplete ───
// Uses wger exerciseinfo with broader fetching to find matches
function ExerciseSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (suggestion: WgerSuggestion) => void;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<WgerSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressRef = useRef(false);
  const cacheRef = useRef<WgerSuggestion[]>([]);
  const fetchedRef = useRef(false);

  // Prefetch exercises: load from localStorage cache first, then refresh from API
  const EXERCISE_CACHE_KEY = "fitsoul_wger_exercises";
  const EXERCISE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Load cached data immediately
    try {
      const cached = localStorage.getItem(EXERCISE_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0) {
          cacheRef.current = data;
          // If cache is still fresh, skip API fetch
          if (Date.now() - timestamp < EXERCISE_CACHE_TTL) return;
        }
      }
    } catch {}

    // Fetch from API and update cache
    (async () => {
      try {
        const offsets = [0, 50, 100, 150, 200, 250, 300, 350, 400];
        const urls = offsets.map(
          (o) => `https://wger.de/api/v2/exerciseinfo/?format=json&language=7&limit=50&offset=${o}`
        );
        const responses = await Promise.all(urls.map((u) => fetch(u).then((r) => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))));
        const all: WgerSuggestion[] = [];
        const seen = new Set<string>();
        for (const data of responses) {
          for (const ex of data.results || []) {
            const pt = ex.translations?.find((t: any) => t.language === 7);
            const en = ex.translations?.find((t: any) => t.language === 2);
            const t = pt || en || ex.translations?.[0];
            if (!t || !t.name?.trim()) continue;
            const key = t.name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            const mainImg = ex.images?.find((img: any) => img.is_main);
            const img = mainImg?.image || ex.images?.[0]?.image || null;
            const catName = ex.category?.name || "";
            all.push({
              name: t.name,
              nameEn: en?.name?.trim() || "",
              category: catName,
              image: img,
              restSeconds: getRestSecondsForCategory(catName),
            });
          }
        }
        if (all.length > 0) {
          cacheRef.current = all;
          localStorage.setItem(EXERCISE_CACHE_KEY, JSON.stringify({ data: all, timestamp: Date.now() }));
        }
      } catch {}
    })();
  }, []);

  // Search locally through cache with debounce — searches PT name, EN name, and category
  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current && clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const q = value.toLowerCase();
      const matched = cacheRef.current
        .filter((s) =>
          s.name.toLowerCase().includes(q) ||
          s.nameEn.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        )
        .slice(0, 15);
      setSuggestions(matched);
      setShowDropdown(matched.length > 0);
      setLoading(false);
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 2 && suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        className={className}
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-popover border border-border shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border/30 last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                suppressRef.current = true;
                onSelect(s);
                setShowDropdown(false);
              }}
            >
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.name}
                  className="h-10 w-10 rounded-lg object-contain bg-background shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-popover-foreground truncate">{s.name}</p>
                {s.nameEn && s.nameEn.toLowerCase() !== s.name.toLowerCase() && (
                  <p className="text-[10px] text-muted-foreground/70 truncate italic">{s.nameEn}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {s.category} · Descanso: {s.restSeconds}s
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editWorkout?: LocalWorkout | null;
  onSaved: () => void;
}

export function CreateEditWorkoutDialog({ open, onOpenChange, editWorkout, onSaved }: Props) {
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("none");
  const [exercises, setExercises] = useState<LocalExercise[]>([emptyExercise()]);

  useEffect(() => {
    if (editWorkout) {
      setName(editWorkout.name);
      setDayOfWeek(editWorkout.day_of_week != null ? String(editWorkout.day_of_week) : "none");
      setExercises(
        editWorkout.exercises.length > 0
          ? editWorkout.exercises.map((ex) => ({ ...ex, media_url: ex.media_url || "" }))
          : [emptyExercise()]
      );
    } else {
      setName("");
      setDayOfWeek("none");
      setExercises([emptyExercise()]);
    }
  }, [editWorkout, open]);

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);

  const removeExercise = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const duplicateExercise = (idx: number) => {
    setExercises((prev) => {
      const copy = { ...prev[idx], exercise_name: `${prev[idx].exercise_name} (cópia)` };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const moveExercise = (idx: number, direction: "up" | "down") => {
    setExercises((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const updateExercise = useCallback((idx: number, field: keyof LocalExercise, value: string | number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, [field]: value } : ex))
    );
  }, []);

  const handleSelectSuggestion = useCallback((idx: number, suggestion: WgerSuggestion) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === idx
          ? {
              exercise_name: suggestion.name,
              sets: ex.sets,
              reps: ex.reps,
              rest_seconds: suggestion.restSeconds,
              media_url: suggestion.image || "",
            }
          : ex
      )
    );
  }, []);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Digite um nome para o treino");
      return;
    }
    const validExercises = exercises
      .filter((ex) => ex.exercise_name.trim())
      .map((ex) => ({
        ...ex,
        media_url: ex.media_url?.trim() || undefined,
      }));
    if (validExercises.length === 0) {
      toast.error("Adicione pelo menos um exercício");
      return;
    }

    const allWorkouts = loadLocalWorkouts();
    const dow = dayOfWeek === "none" ? null : Number(dayOfWeek);

    if (editWorkout) {
      const updated = allWorkouts.map((w) =>
        w.id === editWorkout.id
          ? { ...w, name: name.trim(), day_of_week: dow, exercises: validExercises }
          : w
      );
      saveLocalWorkouts(updated);
      toast.success("Treino atualizado!");
    } else {
      const newWorkout: LocalWorkout = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        day_of_week: dow,
        exercises: validExercises,
      };
      saveLocalWorkouts([...allWorkouts, newWorkout]);
      toast.success("Treino criado!");
    }

    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {editWorkout ? "Editar Treino" : "Criar Treino"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editWorkout ? "Edite os detalhes do seu treino" : "Monte seu treino personalizado"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Workout Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Nome do Treino</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treino A - Peito e Tríceps"
              className="rounded-xl"
            />
          </div>

          {/* Day of Week */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Dia da Semana</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione um dia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem dia fixo</SelectItem>
                {Object.entries(dayLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Exercícios ({exercises.length})</Label>
              <button
                onClick={addExercise}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:opacity-80"
              >
                <AddCircleBold size={16} color="currentColor" />
                Adicionar
              </button>
            </div>

            {exercises.map((ex, idx) => (
              <div key={idx} className="rounded-xl bg-muted/50 p-3 space-y-2">
                {/* Exercise Name + Actions */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 text-center">{idx + 1}</span>
                  <ExerciseSearchInput
                    value={ex.exercise_name}
                    onChange={(v) => updateExercise(idx, "exercise_name", v)}
                    onSelect={(s) => handleSelectSuggestion(idx, s)}
                    placeholder={`Exercício ${idx + 1}`}
                    className="rounded-lg text-sm"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => moveExercise(idx, "up")}
                      disabled={idx === 0}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      title="Mover para cima"
                    >
                      <AltArrowUpBold size={12} color="currentColor" />
                    </button>
                    <button
                      onClick={() => moveExercise(idx, "down")}
                      disabled={idx === exercises.length - 1}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      title="Mover para baixo"
                    >
                      <AltArrowDownBold size={12} color="currentColor" />
                    </button>
                    <button
                      onClick={() => duplicateExercise(idx)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      title="Duplicar exercício"
                    >
                      <CopyBold size={12} color="currentColor" />
                    </button>
                    {exercises.length > 1 && (
                      <button
                        onClick={() => removeExercise(idx)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remover exercício"
                      >
                        <TrashBinTrashBold size={12} color="currentColor" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sets / Reps / Rest */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Séries</span>
                    <Input
                      type="number"
                      min={1}
                      value={ex.sets}
                      onChange={(e) => updateExercise(idx, "sets", Math.max(1, Number(e.target.value)))}
                      className="rounded-lg text-sm text-center h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Reps</span>
                    <Input
                      type="number"
                      min={1}
                      value={ex.reps}
                      onChange={(e) => updateExercise(idx, "reps", Math.max(1, Number(e.target.value)))}
                      className="rounded-lg text-sm text-center h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Descanso (s)</span>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={ex.rest_seconds}
                      onChange={(e) => updateExercise(idx, "rest_seconds", Math.max(0, Number(e.target.value)))}
                      className="rounded-lg text-sm text-center h-8"
                    />
                  </div>
                </div>

                {/* Media URL (GIF / Video) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <VideocameraAddBold size={12} color="currentColor" className="text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground">GIF / Vídeo (URL)</span>
                  </div>
                  <Input
                    value={ex.media_url || ""}
                    onChange={(e) => updateExercise(idx, "media_url", e.target.value)}
                    placeholder="https://... (GIF ou link de vídeo)"
                    className="rounded-lg text-xs h-8"
                  />
                  {ex.media_url && ex.media_url.trim() && (
                    <MediaPreview url={ex.media_url.trim()} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} className="rounded-xl py-5 text-base font-bold w-full mt-2">
            {editWorkout ? "Salvar Alterações" : "Criar Treino"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small preview for GIF/video URLs */
function MediaPreview({ url }: { url: string }) {
  const isGif = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(url);
  const isYoutube = /youtu\.?be/i.test(url);
  const isDirectVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

  if (isGif) {
    return (
      <img
        src={url}
        alt="Preview"
        className="w-full max-h-32 object-contain rounded-lg mt-1 bg-background"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  if (isYoutube) {
    const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
    if (videoId) {
      return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mt-1">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Preview"
          />
        </div>
      );
    }
  }

  if (isDirectVideo) {
    return (
      <video
        src={url}
        controls
        muted
        className="w-full max-h-32 rounded-lg mt-1 bg-background"
        onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] text-primary underline mt-1 inline-block truncate max-w-full"
    >
      Abrir mídia
    </a>
  );
}
