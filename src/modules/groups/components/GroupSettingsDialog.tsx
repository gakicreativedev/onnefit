import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type Group, type GroupMember } from "../hooks/useGroups";
import { type ScoreRules } from "../hooks/useGroupFeed";
import { AddCircleBold, TrashBinTrashBold } from "solar-icon-set";

interface Props {
    group: Group;
    members: GroupMember[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (groupId: string, settings: Partial<Pick<Group, "name" | "description" | "group_type" | "start_date" | "end_date" | "start_of_week" | "score_rules" | "is_public">>) => void;
    onTransferAdmin: (groupId: string, newAdminUserId: string) => void;
    currentUserId: string;
}

export default function GroupSettingsDialog({ group, members, open, onOpenChange, onSave, onTransferAdmin, currentUserId }: Props) {
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || "");
    const [groupType, setGroupType] = useState(group.group_type || "club");
    const [startDate, setStartDate] = useState(group.start_date || "");
    const [endDate, setEndDate] = useState(group.end_date || "");
    const [startOfWeek, setStartOfWeek] = useState(String(group.start_of_week ?? 1));
    const [isPublic, setIsPublic] = useState(group.is_public);
    const [scoreType, setScoreType] = useState<ScoreRules["type"]>(group.score_rules?.type || "per_workout");
    const [scoreValue, setScoreValue] = useState(String(group.score_rules?.value ?? 1));
    const [customRules, setCustomRules] = useState<{ label: string; points: number }[]>(group.score_rules?.rules || []);
    const [newRuleLabel, setNewRuleLabel] = useState("");
    const [newRulePoints, setNewRulePoints] = useState("1");
    const [transferTarget, setTransferTarget] = useState("");

    const addCustomRule = () => {
        if (!newRuleLabel.trim()) return;
        setCustomRules(prev => [...prev, { label: newRuleLabel.trim(), points: parseFloat(newRulePoints) || 1 }]);
        setNewRuleLabel("");
        setNewRulePoints("1");
    };

    const removeCustomRule = (idx: number) => {
        setCustomRules(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        const scoreRules: ScoreRules = scoreType === "custom"
            ? { type: "custom", rules: customRules }
            : { type: scoreType, value: parseFloat(scoreValue) || 1 };

        onSave(group.id, {
            name,
            description: description || null,
            group_type: groupType as "club" | "challenge",
            start_date: groupType === "challenge" ? startDate || null : null,
            end_date: groupType === "challenge" ? endDate || null : null,
            start_of_week: parseInt(startOfWeek),
            score_rules: scoreRules,
            is_public: isPublic,
        });
        onOpenChange(false);
    };

    const handleTransfer = () => {
        if (!transferTarget) return;
        if (window.confirm("Tem certeza que deseja transferir o admin?")) {
            onTransferAdmin(group.id, transferTarget);
            onOpenChange(false);
        }
    };

    const otherMembers = members.filter(m => m.user_id !== currentUserId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black">⚙️ Configurações do Grupo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Name & Description */}
                    <div className="space-y-1">
                        <Label className="font-bold">Nome</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Descrição</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {/* Public */}
                    <div className="flex items-center justify-between">
                        <Label className="font-semibold">Grupo público</Label>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                    </div>

                    {/* Group Type */}
                    <div className="space-y-1">
                        <Label className="font-bold">Tipo</Label>
                        <Select value={groupType} onValueChange={setGroupType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="club">🏠 Clube contínuo</SelectItem>
                                <SelectItem value="challenge">🏆 Desafio (com datas)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Challenge dates */}
                    {groupType === "challenge" && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Data início</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Data fim</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Start of week */}
                    <div className="space-y-1">
                        <Label>Primeiro dia da semana</Label>
                        <Select value={startOfWeek} onValueChange={setStartOfWeek}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Domingo</SelectItem>
                                <SelectItem value="1">Segunda-feira</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Scoring */}
                    <div className="rounded-xl bg-primary/5 p-3 space-y-3 border border-primary/20">
                        <Label className="font-bold text-primary">🎯 Regras de Pontuação</Label>
                        <Select value={scoreType} onValueChange={v => setScoreType(v as ScoreRules["type"])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="per_workout">1 ponto por treino</SelectItem>
                                <SelectItem value="distance_km">Por distância (km)</SelectItem>
                                <SelectItem value="duration_min">Por tempo (minutos)</SelectItem>
                                <SelectItem value="calories">Por calorias</SelectItem>
                                <SelectItem value="steps">Por passos</SelectItem>
                                <SelectItem value="custom">Personalizado</SelectItem>
                            </SelectContent>
                        </Select>

                        {scoreType !== "custom" && (
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Pontos por unidade</Label>
                                <Input type="number" step="0.1" min={0.01} value={scoreValue} onChange={e => setScoreValue(e.target.value)} />
                            </div>
                        )}

                        {scoreType === "custom" && (
                            <div className="space-y-2">
                                {customRules.map((r, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                                        <span className="text-xs font-bold flex-1 truncate">{r.label}</span>
                                        <span className="text-xs text-primary font-bold">{r.points} pts</span>
                                        <button onClick={() => removeCustomRule(i)} className="text-muted-foreground hover:text-destructive">
                                            <TrashBinTrashBold size={12} color="currentColor" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex gap-1.5">
                                    <Input placeholder="Ex: 30min yoga" value={newRuleLabel} onChange={e => setNewRuleLabel(e.target.value)} className="text-xs flex-1" />
                                    <Input type="number" placeholder="pts" value={newRulePoints} onChange={e => setNewRulePoints(e.target.value)} className="w-16 text-xs text-center" />
                                    <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={addCustomRule}>
                                        <AddCircleBold size={14} color="currentColor" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transfer Admin */}
                    {otherMembers.length > 0 && (
                        <div className="rounded-xl bg-destructive/5 p-3 space-y-2 border border-destructive/20">
                            <Label className="font-bold text-destructive text-xs">Transferir Admin</Label>
                            <div className="flex gap-2">
                                <Select value={transferTarget} onValueChange={setTransferTarget}>
                                    <SelectTrigger className="text-xs"><SelectValue placeholder="Selecione membro" /></SelectTrigger>
                                    <SelectContent>
                                        {otherMembers.map(m => (
                                            <SelectItem key={m.user_id} value={m.user_id}>
                                                {m.profile?.name || m.profile?.username || "Membro"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button size="sm" variant="destructive" className="shrink-0 text-xs" onClick={handleTransfer} disabled={!transferTarget}>
                                    Transferir
                                </Button>
                            </div>
                        </div>
                    )}

                    <Button onClick={handleSave} className="w-full rounded-xl font-bold">
                        Salvar Configurações
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
