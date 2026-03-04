import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DumbbellBold, AddCircleBold, ClockCircleBold } from "solar-icon-set";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { loadLocalWorkouts, saveLocalWorkouts, type LocalWorkout } from "./CreateEditWorkoutDialog";

// ─── Types ───
interface WgerTranslation {
  id: number;
  language: number;
  name: string;
  description: string;
}

interface WgerMuscle {
  id: number;
  name: string;
  name_en: string;
  image_url_main: string;
  image_url_secondary: string;
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerImage {
  id: number;
  image: string;
  is_main: boolean;
}

interface WgerExercise {
  id: number;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  images: WgerImage[];
  translations: WgerTranslation[];
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WgerExercise[];
}

// ─── Rest time rules by category name ───
const REST_MAP: Record<string, { label: string; seconds: string; color: string }> = {
  "Abs": { label: "30-45s", seconds: "30-45s", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "Calves": { label: "30-45s", seconds: "30-45s", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "Abdominais": { label: "30-45s", seconds: "30-45s", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "Panturrilhas": { label: "30-45s", seconds: "30-45s", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  "Arms": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Chest": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Shoulders": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Braços": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Peito": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Ombros": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Bíceps": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Tríceps": { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  "Back": { label: "90-120s", seconds: "90-120s", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Legs": { label: "90-120s", seconds: "90-120s", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Costas": { label: "90-120s", seconds: "90-120s", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Pernas": { label: "90-120s", seconds: "90-120s", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  "Glúteos": { label: "90-120s", seconds: "90-120s", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const DEFAULT_REST = { label: "60-90s", seconds: "60-90s", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };

function getRestInfo(categoryName: string) {
  return REST_MAP[categoryName] || DEFAULT_REST;
}

function getPtTranslation(ex: WgerExercise) {
  const pt = ex.translations.find((t) => t.language === 7);
  if (pt) return pt;
  const en = ex.translations.find((t) => t.language === 2);
  return en || ex.translations[0] || null;
}

function getMainImage(ex: WgerExercise) {
  const main = ex.images.find((img) => img.is_main);
  return main?.image || ex.images[0]?.image || null;
}

// ─── Categories for filter pills ───
const CATEGORY_FILTERS = [
  { id: 0, label: "Todos" },
  { id: 10, label: "Abdominais" },
  { id: 8, label: "Braços" },
  { id: 12, label: "Costas" },
  { id: 14, label: "Panturrilhas" },
  { id: 11, label: "Peito" },
  { id: 9, label: "Pernas" },
  { id: 13, label: "Ombros" },
];

const PAGE_SIZE = 20;

// ─── Add to workout dialog ───
function AddToWorkoutDialog({
  open,
  onOpenChange,
  exerciseName,
  imageUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exerciseName: string;
  imageUrl: string | null;
}) {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);

  useEffect(() => {
    if (open) setWorkouts(loadLocalWorkouts());
  }, [open]);

  const addToWorkout = (workoutId: string) => {
    const all = loadLocalWorkouts();
    const updated = all.map((w) => {
      if (w.id !== workoutId) return w;
      return {
        ...w,
        exercises: [
          ...w.exercises,
          {
            exercise_name: exerciseName,
            sets: 3,
            reps: 12,
            rest_seconds: 60,
            media_url: imageUrl || undefined,
          },
        ],
      };
    });
    saveLocalWorkouts(updated);
    toast.success(`"${exerciseName}" adicionado ao treino!`);
    onOpenChange(false);
  };

  const createNewWithExercise = () => {
    const newWorkout: LocalWorkout = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: "Novo Treino",
      day_of_week: null,
      exercises: [
        {
          exercise_name: exerciseName,
          sets: 3,
          reps: 12,
          rest_seconds: 60,
          media_url: imageUrl || undefined,
        },
      ],
    };
    const all = loadLocalWorkouts();
    saveLocalWorkouts([...all, newWorkout]);
    toast.success(`Treino criado com "${exerciseName}"!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Adicionar ao Treino</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Escolha um treino para adicionar "{exerciseName}"
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2 max-h-60 overflow-y-auto">
          {workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum treino local encontrado
            </p>
          ) : (
            workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => addToWorkout(w.id)}
                className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-left hover:bg-muted transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 shrink-0">
                  <DumbbellBold size={16} color="currentColor" className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-card-foreground truncate">{w.name}</p>
                  <p className="text-xs text-muted-foreground">{w.exercises.length} exercícios</p>
                </div>
              </button>
            ))
          )}
        </div>
        <Button onClick={createNewWithExercise} variant="outline" className="rounded-xl w-full mt-1">
          <AddCircleBold size={16} color="currentColor" className="mr-2" />
          Criar novo treino com este exercício
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───
export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<WgerExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Detail modal
  const [detailExercise, setDetailExercise] = useState<WgerExercise | null>(null);

  // Add to workout
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addExerciseName, setAddExerciseName] = useState("");
  const [addExerciseImage, setAddExerciseImage] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  useEffect(() => {
    debounceRef.current && clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search]);

  const buildUrl = useCallback(
    (offset = 0) => {
      let url = `https://wger.de/api/v2/exerciseinfo/?format=json&language=7&limit=${PAGE_SIZE}&offset=${offset}`;
      if (categoryFilter > 0) url += `&category=${categoryFilter}`;
      return url;
    },
    [categoryFilter]
  );

  const fetchPage = useCallback(
    async (url: string, append = false) => {
      setLoading(true);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erro ao buscar exercícios");
        const data: ApiResponse = await res.json();

        // Filter by search locally (API doesn't support PT search well)
        let results = data.results.filter((ex) => {
          const t = getPtTranslation(ex);
          return t && t.name.trim().length > 0;
        });

        setExercises((prev) => (append ? [...prev, ...results] : results));
        setNextUrl(data.next);
        setHasMore(!!data.next);
        setInitialLoaded(true);
      } catch {
        toast.error("Não foi possível carregar os exercícios");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reset and fetch on filter/search change
  useEffect(() => {
    setExercises([]);
    setNextUrl(null);
    setHasMore(true);
    fetchPage(buildUrl(0), false);
  }, [categoryFilter, fetchPage, buildUrl]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && nextUrl) {
          fetchPage(nextUrl, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, nextUrl, fetchPage]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return exercises;
    const q = debouncedSearch.toLowerCase();
    return exercises.filter((ex) => {
      const t = getPtTranslation(ex);
      if (!t) return false;
      return (
        t.name.toLowerCase().includes(q) ||
        ex.category.name.toLowerCase().includes(q) ||
        ex.muscles.some((m) => m.name.toLowerCase().includes(q) || m.name_en.toLowerCase().includes(q))
      );
    });
  }, [exercises, debouncedSearch]);

  const handleAddToWorkout = (ex: WgerExercise) => {
    const t = getPtTranslation(ex);
    setAddExerciseName(t?.name || "Exercício");
    setAddExerciseImage(getMainImage(ex));
    setAddDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar exercício..."
          className="pl-10 rounded-xl"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <Badge
            key={cat.id}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold shrink-0 transition-colors border ${
              categoryFilter === cat.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            }`}
            onClick={() => setCategoryFilter(cat.id)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Exercise grid */}
      {!initialLoaded && loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col rounded-2xl bg-muted/50 overflow-hidden">
              <Skeleton className="w-full aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <DumbbellBold size={48} color="currentColor" className="text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Nenhum exercício encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((ex) => {
            const t = getPtTranslation(ex);
            const img = getMainImage(ex);
            const rest = getRestInfo(ex.category.name);
            if (!t) return null;

            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-2xl bg-muted/50 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all group"
                onClick={() => setDetailExercise(ex)}
              >
                {/* Image */}
                <div className="relative w-full aspect-square bg-background flex items-center justify-center overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={t.name}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <DumbbellBold size={40} color="currentColor" className="text-muted-foreground/30" />
                  )}
                  {/* Rest badge */}
                  <div
                    className={`absolute top-2 right-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${rest.color}`}
                  >
                    <ClockCircleBold size={10} color="currentColor" />
                    {rest.label}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="text-sm font-bold text-card-foreground leading-tight line-clamp-2">
                    {t.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{ex.category.name}</p>
                  {ex.muscles.length > 0 && (
                    <p className="text-[10px] text-primary/80 line-clamp-1">
                      {ex.muscles.map((m) => m.name || m.name_en).join(", ")}
                    </p>
                  )}
                </div>

                {/* Quick add button */}
                <div className="px-3 pb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-bold h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToWorkout(ex);
                    }}
                  >
                    <AddCircleBold size={14} color="currentColor" className="mr-1" />
                    Adicionar
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Loading more */}
      {loading && initialLoaded && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Detail Modal */}
      <AnimatePresence>
        {detailExercise && (
          <ExerciseDetailModal
            exercise={detailExercise}
            onClose={() => setDetailExercise(null)}
            onAddToWorkout={handleAddToWorkout}
          />
        )}
      </AnimatePresence>

      {/* Add to workout dialog */}
      <AddToWorkoutDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        exerciseName={addExerciseName}
        imageUrl={addExerciseImage}
      />
    </div>
  );
}

// ─── Detail Modal ───
function ExerciseDetailModal({
  exercise,
  onClose,
  onAddToWorkout,
}: {
  exercise: WgerExercise;
  onClose: () => void;
  onAddToWorkout: (ex: WgerExercise) => void;
}) {
  const t = getPtTranslation(exercise);
  const img = getMainImage(exercise);
  const rest = getRestInfo(exercise.category.name);

  if (!t) return null;

  // Clean HTML description
  const descriptionText = t.description
    ? t.description.replace(/<[^>]*>/g, "").trim()
    : "";

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold leading-tight">{t.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {exercise.category.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Image */}
          {img && (
            <div className="relative w-full rounded-xl overflow-hidden bg-background">
              <img
                src={img}
                alt={t.name}
                className="w-full object-contain max-h-64"
                loading="lazy"
              />
              <div
                className={`absolute top-3 right-3 flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${rest.color}`}
              >
                <ClockCircleBold size={12} color="currentColor" />
                Descanso: {rest.label}
              </div>
            </div>
          )}

          {/* All images */}
          {exercise.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {exercise.images.map((imgObj) => (
                <img
                  key={imgObj.id}
                  src={imgObj.image}
                  alt={t.name}
                  className="h-20 w-20 rounded-lg object-contain bg-background shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* Muscles */}
          {(exercise.muscles.length > 0 || exercise.muscles_secondary.length > 0) && (
            <div className="space-y-2">
              {exercise.muscles.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">Músculos Primários</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.muscles.map((m) => (
                      <Badge
                        key={m.id}
                        variant="secondary"
                        className="rounded-full text-[10px] font-bold"
                      >
                        {m.name || m.name_en}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {exercise.muscles_secondary.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">Músculos Secundários</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.muscles_secondary.map((m) => (
                      <Badge
                        key={m.id}
                        variant="outline"
                        className="rounded-full text-[10px]"
                      >
                        {m.name || m.name_en}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {descriptionText && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-card-foreground leading-relaxed">{descriptionText}</p>
            </div>
          )}

          {/* Add to workout */}
          <Button
            className="rounded-xl py-5 text-base font-bold w-full"
            onClick={() => onAddToWorkout(exercise)}
          >
            <AddCircleBold size={18} color="currentColor" className="mr-2" />
            Adicionar ao Treino
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
