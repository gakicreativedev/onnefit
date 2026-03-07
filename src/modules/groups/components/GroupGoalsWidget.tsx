import { useState } from "react";
import { motion } from "framer-motion";
import { type GroupGoal } from "../hooks/useGroups";
import { TargetBold, AddCircleBold, TrashBinTrashBold, ConfettiBold } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GroupGoalsWidgetProps {
    goals: GroupGoal[];
    isAdmin: boolean;
    onCreateGoal: (goal: Partial<GroupGoal>) => Promise<void>;
    onDeleteGoal: (id: string) => Promise<void>;
}

export default function GroupGoalsWidget({ goals, isAdmin, onCreateGoal, onDeleteGoal }: GroupGoalsWidgetProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [targetValue, setTargetValue] = useState("");
    const [metricType, setMetricType] = useState("distance_km");

    const handleCreate = async () => {
        if (!title || !targetValue) return;
        await onCreateGoal({
            title,
            target_value: Number(targetValue),
            metric_type: metricType,
        });
        setOpen(false);
        setTitle("");
        setTargetValue("");
    };

    const getMetricLabel = (type: string) => {
        switch (type) {
            case "distance_km": return "km";
            case "duration_min": return "min";
            case "calories": return "kcal";
            case "steps": return "passos";
            default: return "";
        }
    };

    if (goals.length === 0 && !isAdmin) return null;

    return (
        <div className="space-y-3 mb-2">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <TargetBold size={16} className="text-primary" />
                    Metas Coletivas
                </h3>
                {isAdmin && (
                    <button onClick={() => setOpen(true)} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                        <AddCircleBold size={14} /> Nova Meta
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {goals.map(goal => {
                    const current = goal.current_value || 0;
                    const target = goal.target_value;
                    const percent = Math.min(100, Math.round((current / target) * 100));
                    const isComplete = percent >= 100;

                    return (
                        <motion.div key={goal.id} className="relative bg-card border border-border/50 rounded-xl p-3 overflow-hidden"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        >
                            {isComplete && (
                                <div className="absolute top-0 right-0 p-2">
                                    <ConfettiBold size={24} className="text-amber-500 animate-pulse" />
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-sm text-foreground pr-8">{goal.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        <span className={isComplete ? "text-primary font-bold" : "text-foreground font-medium"}>
                                            {current.toLocaleString()}
                                        </span>
                                        {" / "}{target.toLocaleString()} {getMetricLabel(goal.metric_type)}
                                    </p>
                                </div>
                                {isAdmin && (
                                    <button onClick={() => onDeleteGoal(goal.id)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                                        <TrashBinTrashBold size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    className={`h-full rounded-full ${isComplete ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-primary"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Nova Meta Coletiva</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Título da Meta</label>
                            <Input placeholder="Ex: Correr 1.000km juntos" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Alvo Numérico</label>
                                <Input type="number" placeholder="1000" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">O que somar?</label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                                    value={metricType} onChange={e => setMetricType(e.target.value)}
                                >
                                    <option value="distance_km">Quilômetros (km)</option>
                                    <option value="duration_min">Duração (minutos)</option>
                                    <option value="calories">Calorias (kcal)</option>
                                    <option value="steps">Passos</option>
                                </select>
                            </div>
                        </div>
                        <Button className="w-full font-bold mt-2" onClick={handleCreate}>Criar Meta</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
