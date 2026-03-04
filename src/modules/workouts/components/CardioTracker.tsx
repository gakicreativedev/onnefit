import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useProfile } from "@/modules/auth/hooks/useProfile";
import { toast } from "sonner";
import { PlayBold, StopBold, ClockCircleBold, CheckCircleBold, TrashBinTrashBold, ShareBold } from "solar-icon-set";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTIVITIES = [
  { key: "esteira", label: "Esteira", emoji: "🏃", met: 8.0 },
  { key: "caminhada", label: "Caminhada", emoji: "🚶", met: 3.5 },
  { key: "corrida", label: "Corrida", emoji: "🏃‍♂️", met: 9.8 },
  { key: "bicicleta", label: "Bicicleta", emoji: "🚴", met: 7.5 },
  { key: "bike_ergométrica", label: "Bike Ergométrica", emoji: "🚵", met: 6.8 },
  { key: "elíptico", label: "Elíptico", emoji: "⚙️", met: 5.0 },
  { key: "corda", label: "Corda", emoji: "🪢", met: 11.0 },
  { key: "natação", label: "Natação", emoji: "🏊", met: 8.0 },
  { key: "remo", label: "Remo", emoji: "🚣", met: 7.0 },
  { key: "escada", label: "Escada", emoji: "🪜", met: 9.0 },
];

const CARDIO_CACHE_KEY = "onnefit_cardio_active";

interface CardioSession {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  completed_at: string;
}

interface CardioResult {
  activity: string;
  emoji: string;
  duration: number;
  distance: number | null;
  calories: number;
}

function saveCardioCache(data: { activity: string; elapsed: number; distance: string; startedAt: number }) {
  try { localStorage.setItem(CARDIO_CACHE_KEY, JSON.stringify(data)); } catch { }
}

function loadCardioCache(): { activity: string; elapsed: number; distance: string; startedAt: number } | null {
  try {
    const raw = localStorage.getItem(CARDIO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearCardioCache() {
  localStorage.removeItem(CARDIO_CACHE_KEY);
}

function calculateCalories(met: number, weightKg: number, durationMinutes: number): number {
  // Calorie formula: MET × weight(kg) × duration(hours)
  return Math.round(met * weightKg * (durationMinutes / 60));
}

export default function CardioTracker() {
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES[0].key);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState("");
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultDialog, setResultDialog] = useState<CardioResult | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Restore from cache on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const cached = loadCardioCache();
    if (cached) {
      setSelectedActivity(cached.activity);
      setDistance(cached.distance);
      // Calculate elapsed since cache was saved
      const now = Date.now();
      const totalElapsed = cached.elapsed + Math.floor((now - cached.startedAt) / 1000);
      setElapsed(totalElapsed);
    }
  }, []);

  // Auto-save cache when state changes
  useEffect(() => {
    if (elapsed > 0) {
      saveCardioCache({
        activity: selectedActivity,
        elapsed,
        distance,
        startedAt: Date.now(),
      });
    }
  }, [elapsed, selectedActivity, distance]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("cardio_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setSessions((data as CardioSession[]) || []));
  }, [user]);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = () => setRunning(true);
  const handleStop = () => setRunning(false);

  const handleSave = async () => {
    if (!user || elapsed < 10) { toast.error("Realize pelo menos 10 segundos de cardio"); return; }
    setSaving(true);
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const dist = distance ? parseFloat(distance) : null;
    const actObj = ACTIVITIES.find(a => a.key === selectedActivity);
    const weightKg = profile?.weight_kg || 70;
    const calories = calculateCalories(actObj?.met || 6.0, weightKg, durationMinutes);

    const { data, error } = await supabase.from("cardio_sessions").insert({
      user_id: user.id,
      activity_type: selectedActivity,
      duration_minutes: durationMinutes,
      distance_km: dist,
      calories_burned: calories,
    }).select().single();

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar cardio");
    } else {
      clearCardioCache();
      // Show result dialog
      setResultDialog({
        activity: actObj?.label || selectedActivity,
        emoji: actObj?.emoji || "🏃",
        duration: durationMinutes,
        distance: dist,
        calories,
      });
      setElapsed(0);
      setRunning(false);
      setDistance("");
      if (data) setSessions(prev => [data as CardioSession, ...prev.slice(0, 4)]);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cardio_sessions").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Sessão removida");
  };

  const handleShareResult = async () => {
    if (!resultRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(resultRef.current, { backgroundColor: null, scale: 2 });
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cardio-${format(new Date(), "yyyy-MM-dd")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Resultado salvo como imagem!");
      });
    } catch {
      toast.error("Erro ao gerar imagem");
    }
  };

  const activityObj = ACTIVITIES.find(a => a.key === selectedActivity);

  return (
    <div className="space-y-4">
      {/* Activity picker */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {ACTIVITIES.map(act => (
          <button
            key={act.key}
            onClick={() => setSelectedActivity(act.key)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs font-semibold transition-all ${selectedActivity === act.key
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
          >
            <span className="text-lg">{act.emoji}</span>
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="rounded-[20px] bg-card p-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
          <ClockCircleBold size={16} color="currentColor" />
          <span>{activityObj?.emoji} {activityObj?.label}</span>
        </div>

        <motion.div
          className="text-6xl font-black tabular-nums tracking-tighter text-foreground"
          animate={{ scale: running ? [1, 1.01, 1] : 1 }}
          transition={{ duration: 1, repeat: running ? Infinity : 0 }}
        >
          {formatTime(elapsed)}
        </motion.div>

        {/* Distance input */}
        <div className="flex items-center gap-2 w-full max-w-xs">
          <Input
            type="number"
            step="0.1"
            min={0}
            value={distance}
            onChange={e => setDistance(e.target.value)}
            placeholder="Distância (km) — opcional"
            className="text-center"
          />
        </div>

        {/* Controls */}
        <div className="flex gap-3 w-full max-w-xs">
          {!running ? (
            <Button
              className="flex-1 rounded-2xl py-6 text-base font-bold"
              onClick={handleStart}
              disabled={saving}
            >
              <PlayBold size={20} color="currentColor" className="mr-2" />
              {elapsed > 0 ? "Continuar" : "Iniciar"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 rounded-2xl py-6 text-base font-bold border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleStop}
            >
              <StopBold size={20} color="currentColor" className="mr-2" />
              Pausar
            </Button>
          )}

          {elapsed > 0 && !running && (
            <Button
              className="flex-1 rounded-2xl py-6 text-base font-bold"
              onClick={handleSave}
              disabled={saving}
            >
              <CheckCircleBold size={20} color="currentColor" className="mr-2" />
              {saving ? "Salvando..." : "Finalizar"}
            </Button>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Histórico Recente</h3>
          <AnimatePresence>
            {sessions.map(session => {
              const act = ACTIVITIES.find(a => a.key === session.activity_type);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 rounded-xl bg-card p-3"
                >
                  <span className="text-2xl">{act?.emoji || "🏃"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{act?.label || session.activity_type}</div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>{session.duration_minutes} min</span>
                      {session.distance_km && <span>· {session.distance_km} km</span>}
                      {session.calories_burned && <span>· {session.calories_burned} kcal</span>}
                      <span>· {format(new Date(session.completed_at), "dd MMM", { locale: ptBR })}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <TrashBinTrashBold size={14} color="currentColor" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Result Dialog */}
      <Dialog open={!!resultDialog} onOpenChange={(open) => { if (!open) setResultDialog(null); }}>
        <DialogContent className="sm:max-w-sm rounded-[24px] p-0 overflow-hidden">
          <div ref={resultRef} className="bg-gradient-to-br from-primary via-primary to-primary/80 p-8 flex flex-col items-center gap-6 text-primary-foreground">
            <DialogHeader className="items-center">
              <DialogTitle className="text-lg font-black text-primary-foreground">Cardio Concluído! 🎉</DialogTitle>
            </DialogHeader>

            <div className="text-6xl">{resultDialog?.emoji}</div>
            <h3 className="text-xl font-black">{resultDialog?.activity}</h3>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="rounded-2xl bg-primary-foreground/15 backdrop-blur-sm p-4 text-center">
                <p className="text-3xl font-black">{resultDialog?.duration}</p>
                <p className="text-xs text-primary-foreground/70">minutos</p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/15 backdrop-blur-sm p-4 text-center">
                <p className="text-3xl font-black">{resultDialog?.calories}</p>
                <p className="text-xs text-primary-foreground/70">kcal</p>
              </div>
              {resultDialog?.distance && (
                <div className="col-span-2 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm p-4 text-center">
                  <p className="text-3xl font-black">{resultDialog.distance} km</p>
                  <p className="text-xs text-primary-foreground/70">distância</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={handleShareResult}>
              <ShareBold size={16} color="currentColor" className="mr-2" />
              Salvar PNG
            </Button>
            <Button className="flex-1 rounded-xl" onClick={() => setResultDialog(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
