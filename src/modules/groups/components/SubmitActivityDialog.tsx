import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { type ScoreRules } from "../hooks/useGroupFeed";
import { CameraBold, GalleryBold, RunningBold, StopwatchBold, FireBold, WalkingBold, CupStarBold } from "solar-icon-set";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scoreRules: ScoreRules;
    onSubmit: (data: {
        title: string;
        photoFile: File;
        description?: string;
        distance_km?: number;
        duration_min?: number;
        calories?: number;
        steps?: number;
        custom_rule_label?: string;
        scoreRules: ScoreRules;
    }) => Promise<void>;
}

export default function SubmitActivityDialog({ open, onOpenChange, scoreRules, onSubmit }: Props) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [distanceKm, setDistanceKm] = useState("");
    const [durationMin, setDurationMin] = useState("");
    const [calories, setCalories] = useState("");
    const [steps, setSteps] = useState("");
    const [customRule, setCustomRule] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const galleryRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { toast.error("Foto deve ter no máximo 10MB"); return; }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        e.target.value = "";
    };

    const handleSubmit = async () => {
        if (!title.trim()) { toast.error("Insira um título"); return; }
        if (!photoFile) { toast.error("Foto é obrigatória!"); return; }
        setSubmitting(true);

        await onSubmit({
            title,
            photoFile,
            description: description || undefined,
            distance_km: distanceKm ? parseFloat(distanceKm) : undefined,
            duration_min: durationMin ? parseInt(durationMin) : undefined,
            calories: calories ? parseInt(calories) : undefined,
            steps: steps ? parseInt(steps) : undefined,
            custom_rule_label: customRule || undefined,
            scoreRules,
        });

        setSubmitting(false);
        setTitle("");
        setDescription("");
        setPhotoFile(null);
        setPhotoPreview(null);
        setDistanceKm("");
        setDurationMin("");
        setCalories("");
        setSteps("");
        setCustomRule("");
        onOpenChange(false);
    };

    const needsDistance = scoreRules.type === "distance_km";
    const needsDuration = scoreRules.type === "duration_min";
    const needsCalories = scoreRules.type === "calories";
    const needsSteps = scoreRules.type === "steps";
    const isCustom = scoreRules.type === "custom";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black flex items-center gap-2">
                        <CameraBold size={20} color="currentColor" /> Registrar Atividade
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Photo - REQUIRED */}
                    <div className="space-y-1">
                        <Label className="font-bold">Foto do treino *</Label>
                        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                        {photoPreview ? (
                            <div className="relative rounded-2xl overflow-hidden">
                                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-2xl" />
                                <button
                                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 text-foreground flex items-center justify-center text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2 w-full">
                                <button onClick={() => galleryRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors bg-primary/5">
                                    <span className="text-foreground"><GalleryBold size={32} color="currentColor" /></span>
                                    <span className="text-xs text-muted-foreground font-bold">Galeria</span>
                                </button>
                                <button onClick={() => cameraRef.current?.click()} className="flex-1 flex flex-col items-center justify-center gap-2 h-32 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors bg-primary/5">
                                    <span className="text-foreground"><CameraBold size={32} color="currentColor" /></span>
                                    <span className="text-xs text-muted-foreground font-bold">Câmera</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Title - REQUIRED */}
                    <div className="space-y-1">
                        <Label className="font-bold">Título *</Label>
                        <Input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Treino de pernas, Corrida matinal..."
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <Label>Descrição (opcional)</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Como foi o treino?"
                            className="resize-none min-h-[60px]"
                            maxLength={500}
                        />
                    </div>

                    {/* Custom rule selector */}
                    {isCustom && scoreRules.rules && (
                        <div className="space-y-1">
                            <Label className="font-bold">Tipo de atividade *</Label>
                            <Select value={customRule} onValueChange={setCustomRule}>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {scoreRules.rules.map(r => (
                                        <SelectItem key={r.label} value={r.label}>
                                            {r.label} ({r.points} pts)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Metrics — show required ones prominently, others as optional */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs">Métricas {!needsDistance && !needsDuration && !needsCalories && !needsSteps ? "(opcionais)" : ""}</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className={`text-xs flex items-center gap-1 ${needsDistance ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                    <RunningBold size={14} color="currentColor" /> Distância (km) {needsDistance && "*"}
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={distanceKm}
                                    onChange={e => setDistanceKm(e.target.value)}
                                    placeholder="0.0"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className={`text-xs flex items-center gap-1 ${needsDuration ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                    <StopwatchBold size={14} color="currentColor" /> Duração (min) {needsDuration && "*"}
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={durationMin}
                                    onChange={e => setDurationMin(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className={`text-xs flex items-center gap-1 ${needsCalories ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                    <FireBold size={14} color="currentColor" /> Calorias {needsCalories && "*"}
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={calories}
                                    onChange={e => setCalories(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className={`text-xs flex items-center gap-1 ${needsSteps ? "text-primary font-bold" : "text-muted-foreground"}`}>
                                    <WalkingBold size={14} color="currentColor" /> Passos {needsSteps && "*"}
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={steps}
                                    onChange={e => setSteps(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !photoFile} className="w-full rounded-xl py-5 font-black text-base">
                        <CupStarBold size={20} color="currentColor" className="mr-2 inline" /> Registrar Atividade
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
