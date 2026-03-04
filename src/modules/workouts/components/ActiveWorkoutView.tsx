import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CheckCircleBold,
    CloseCircleBold,
    AddCircleBold,
    MinusCircleBold,
    CupStarBold,
    VideocameraAddBold,
} from "solar-icon-set";
import type { Workout, ExerciseTracker } from "@/lib/types";
import { RestTimer } from "@/modules/workouts/components/RestTimer";

interface ActiveWorkoutViewProps {
    activeWorkout: Workout;
    trackers: ExerciseTracker[];
    startTime: Date | null;
    saving: boolean;
    completedSets: number;
    totalSets: number;
    restTimer: { seconds: number; name: string } | null;
    onSetRestTimer: (val: { seconds: number; name: string } | null) => void;
    onUpdateSet: (exIdx: number, setIdx: number, field: "reps" | "weight_kg", value: number) => void;
    onToggleSetComplete: (exIdx: number, setIdx: number) => void;
    onCancel: () => void;
    onFinish: () => void;
}

function ExerciseMediaPreview({ url }: { url: string }) {
    const isGif = /\.(gif|webp|png|jpg|jpeg)(\?.*)?$/i.test(url);
    const isYoutube = /youtu\.?be/i.test(url);
    const isDirectVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

    if (isGif) {
        return (
            <img
                src={url}
                alt="Exercício"
                className="w-full max-h-40 object-contain rounded-xl bg-background"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
        );
    }

    if (isYoutube) {
        const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
        if (videoId) {
            return (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Exercício"
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
                loop
                className="w-full max-h-40 rounded-xl bg-background"
                onError={(e) => { (e.target as HTMLVideoElement).style.display = "none"; }}
            />
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary underline"
        >
            <VideocameraAddBold size={14} color="currentColor" />
            Ver demonstração
        </a>
    );
}

export default function ActiveWorkoutView({
    activeWorkout,
    trackers,
    startTime,
    saving,
    completedSets,
    totalSets,
    restTimer,
    onSetRestTimer,
    onUpdateSet,
    onToggleSetComplete,
    onCancel,
    onFinish,
}: ActiveWorkoutViewProps) {
    return (
        <>
            <div className="flex flex-col gap-3 sm:gap-4 max-w-3xl mx-auto">
                <section className="flex flex-col gap-3 rounded-[20px] sm:rounded-[34px] bg-primary p-4 sm:p-8">
                    <div className="flex items-center justify-between">
                        <Badge className="bg-primary-foreground text-primary border-0 rounded-full px-4 py-1.5 text-xs font-bold">
                            Treino Ativo
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary font-bold"
                            onClick={onCancel}
                        >
                            <CloseCircleBold size={14} color="currentColor" className="mr-1" /> Cancelar
                        </Button>
                    </div>
                    <h2 className="text-xl sm:text-3xl font-black uppercase text-primary-foreground tracking-tight leading-tight break-words" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                        {activeWorkout.name}
                    </h2>
                    <div className="flex items-center gap-4 text-primary-foreground/70 text-sm">
                        <span>{completedSets}/{totalSets} séries</span>
                        <span>·</span>
                        <span>{Math.round((Date.now() - (startTime?.getTime() || Date.now())) / 60000)} min</span>
                    </div>
                </section>

                {trackers.map((tracker, exIdx) => {
                    const allDone = tracker.sets.every((s) => s.completed);
                    const completedCount = tracker.sets.filter((s) => s.completed).length;
                    return (
                        <section key={exIdx} className={`flex flex-col rounded-[16px] sm:rounded-[24px] transition-colors ${allDone ? "bg-primary/10 ring-2 ring-primary/30" : "bg-card"}`}>
                            <div className="p-4 sm:p-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-base sm:text-lg font-bold text-card-foreground truncate">{tracker.exercise_name}</h3>
                                    {allDone && <CheckCircleBold size={20} color="currentColor" className="text-primary shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {completedCount}/{tracker.target_sets} séries · {tracker.target_reps} reps · {tracker.rest_seconds}s descanso
                                </p>
                            </div>

                            <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col gap-2">
                                {tracker.media_url && <ExerciseMediaPreview url={tracker.media_url} />}

                                <div className="hidden sm:grid grid-cols-[1fr_80px_100px_48px] gap-2 text-xs font-bold text-muted-foreground px-1">
                                    <span>Série</span>
                                    <span className="text-center">Reps</span>
                                    <span className="text-center">Carga (kg)</span>
                                    <span className="text-center">✓</span>
                                </div>

                                {tracker.sets.map((set, setIdx) => (
                                    <div
                                        key={setIdx}
                                        className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_80px_100px_48px] gap-2 items-center rounded-xl px-2 py-2 transition-colors ${set.completed ? "bg-primary/10" : "bg-muted/50"
                                            }`}
                                    >
                                        <span className="text-sm font-bold text-card-foreground pl-1">Série {setIdx + 1}</span>

                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                                                onClick={() => onUpdateSet(exIdx, setIdx, "reps", set.reps - 1)}
                                            >
                                                <MinusCircleBold size={12} color="currentColor" />
                                            </button>
                                            <span className="text-sm font-bold text-card-foreground w-6 text-center tabular-nums">{set.reps}</span>
                                            <button
                                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                                                onClick={() => onUpdateSet(exIdx, setIdx, "reps", set.reps + 1)}
                                            >
                                                <AddCircleBold size={12} color="currentColor" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                                                onClick={() => onUpdateSet(exIdx, setIdx, "weight_kg", Math.max(0, +(set.weight_kg - 0.5).toFixed(1)))}
                                            >
                                                <MinusCircleBold size={12} color="currentColor" />
                                            </button>
                                            <input
                                                type="number"
                                                step="0.5"
                                                value={set.weight_kg}
                                                onChange={(e) => onUpdateSet(exIdx, setIdx, "weight_kg", Number(e.target.value))}
                                                className="w-12 text-center text-sm font-bold text-primary bg-background rounded-lg py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <button
                                                className="h-7 w-7 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-foreground"
                                                onClick={() => onUpdateSet(exIdx, setIdx, "weight_kg", +(set.weight_kg + 0.5).toFixed(1))}
                                            >
                                                <AddCircleBold size={12} color="currentColor" />
                                            </button>
                                        </div>

                                        <button
                                            className={`h-9 w-9 rounded-xl flex items-center justify-center mx-auto transition-colors ${set.completed
                                                    ? "bg-primary text-card"
                                                    : "bg-background text-muted-foreground hover:text-foreground"
                                                }`}
                                            onClick={() => onToggleSetComplete(exIdx, setIdx)}
                                        >
                                            <CheckCircleBold size={16} color="currentColor" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                <Button
                    className="rounded-2xl py-6 text-lg font-black w-full"
                    onClick={onFinish}
                    disabled={saving || completedSets === 0}
                >
                    {saving ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-card border-t-transparent" />
                    ) : (
                        <>
                            <CupStarBold size={22} color="currentColor" className="mr-2" />
                            Finalizar Treino ({completedSets}/{totalSets})
                        </>
                    )}
                </Button>
            </div>

            {restTimer && (
                <RestTimer seconds={restTimer.seconds} exerciseName={restTimer.name} onClose={() => onSetRestTimer(null)} />
            )}
        </>
    );
}
