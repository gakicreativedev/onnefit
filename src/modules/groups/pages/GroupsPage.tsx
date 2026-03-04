import { useState } from "react";
import { motion } from "framer-motion";
import { useGroups } from "../hooks/useGroups";
import { useNavigate } from "react-router-dom";
import { type ScoreRules } from "../hooks/useGroupFeed";
import {
  UsersGroupTwoRoundedBold,
  AddCircleBold,
  TicketBold,
  LinkRoundBold,
  LockBold,
  GlobalBold,
  ArrowRightBold,
  TrashBinTrashBold,
} from "solar-icon-set";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function GroupsPage() {
  const { myGroups, publicGroups, loading, createGroup, joinByCode } = useGroups();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [inviteCode, setInviteCode] = useState("");

  // Challenge fields
  const [groupType, setGroupType] = useState<"club" | "challenge">("club");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Scoring fields
  const [scoreType, setScoreType] = useState<ScoreRules["type"]>("per_workout");
  const [scoreValue, setScoreValue] = useState("1");
  const [customRules, setCustomRules] = useState<{ label: string; points: number }[]>([]);
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRulePoints, setNewRulePoints] = useState("1");

  const addCustomRule = () => {
    if (!newRuleLabel.trim()) return;
    setCustomRules(prev => [...prev, { label: newRuleLabel.trim(), points: parseFloat(newRulePoints) || 1 }]);
    setNewRuleLabel("");
    setNewRulePoints("1");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const scoreRules: ScoreRules = scoreType === "custom"
      ? { type: "custom", rules: customRules }
      : { type: scoreType, value: parseFloat(scoreValue) || 1 };

    const group = await createGroup({
      name,
      description,
      is_public: isPublic,
      group_type: groupType,
      start_date: groupType === "challenge" ? startDate || undefined : undefined,
      end_date: groupType === "challenge" ? endDate || undefined : undefined,
      score_rules: scoreRules,
    });
    if (group) {
      setCreateOpen(false);
      setName("");
      setDescription("");
      setGroupType("club");
      setStartDate("");
      setEndDate("");
      setScoreType("per_workout");
      setScoreValue("1");
      setCustomRules([]);
      navigate(`/groups/${group.id}`);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    await joinByCode(inviteCode);
    setJoinOpen(false);
    setInviteCode("");
  };

  return (
    <motion.div
      className="flex flex-col gap-4 md:gap-5 max-w-5xl mx-auto w-full"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            <span className="text-primary">Grupos</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Compita com amigos e suba no ranking!</p>
        </div>
        <div className="flex gap-2">
          {/* Join by code */}
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <button className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <TicketBold size={20} color="currentColor" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Entrar com Código</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Cole o código de convite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                <Button className="w-full" onClick={handleJoin} disabled={!inviteCode.trim()}>Entrar no Grupo</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create group */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity">
                <AddCircleBold size={20} color="currentColor" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-lg font-black">🏆 Criar Grupo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Nome do grupo" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />

                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Grupo público</Label>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                {/* Group type */}
                <div className="space-y-1">
                  <Label className="font-bold">Tipo</Label>
                  <Select value={groupType} onValueChange={v => setGroupType(v as "club" | "challenge")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">🏠 Clube contínuo</SelectItem>
                      <SelectItem value="challenge">🏆 Desafio (com datas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {/* Scoring */}
                <div className="rounded-xl bg-primary/5 p-3 space-y-3 border border-primary/20">
                  <Label className="font-bold text-primary text-sm">🎯 Regras de Pontuação</Label>
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
                      <Label className="text-xs text-muted-foreground">Ptos por unidade</Label>
                      <Input type="number" step="0.1" min={0.01} value={scoreValue} onChange={e => setScoreValue(e.target.value)} />
                    </div>
                  )}

                  {scoreType === "custom" && (
                    <div className="space-y-2">
                      {customRules.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-bold flex-1 truncate">{r.label}</span>
                          <span className="text-xs text-primary font-bold">{r.points} pts</span>
                          <button onClick={() => setCustomRules(customRules.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                            <TrashBinTrashBold size={12} color="currentColor" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1.5">
                        <Input placeholder="Ex: 30min yoga" value={newRuleLabel} onChange={e => setNewRuleLabel(e.target.value)} className="text-xs flex-1" />
                        <Input type="number" placeholder="pts" value={newRulePoints} onChange={e => setNewRulePoints(e.target.value)} className="w-14 text-xs text-center" />
                        <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={addCustomRule}>
                          <AddCircleBold size={14} color="currentColor" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button className="w-full font-bold rounded-xl" onClick={handleCreate} disabled={!name.trim()}>Criar Grupo</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* My groups */}
          {myGroups.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Meus Grupos</h2>
              {myGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="w-full rounded-2xl bg-card p-4 flex items-center gap-4 hover:bg-card/80 transition-colors text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <UsersGroupTwoRoundedBold size={24} color="currentColor" className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground truncate">{g.name}</h3>
                      {g.group_type === "challenge" && (
                        <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[9px] font-bold px-1.5 py-0">DESAFIO</Badge>
                      )}
                      {g.is_public ? <GlobalBold size={14} color="currentColor" className="text-muted-foreground shrink-0" /> : <LockBold size={14} color="currentColor" className="text-muted-foreground shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{g.member_count} membros</p>
                  </div>
                  <ArrowRightBold size={18} color="currentColor" className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </motion.div>
          )}

          {/* Public groups to discover */}
          {publicGroups.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Descobrir Grupos</h2>
              {publicGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/groups/${g.id}`)}
                  className="w-full rounded-2xl bg-card p-4 flex items-center gap-4 hover:bg-card/80 transition-colors text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <GlobalBold size={24} color="currentColor" className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground truncate">{g.name}</h3>
                      {g.group_type === "challenge" && (
                        <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[9px] font-bold px-1.5 py-0">DESAFIO</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{g.member_count} membros</p>
                  </div>
                  <ArrowRightBold size={18} color="currentColor" className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </motion.div>
          )}

          {myGroups.length === 0 && publicGroups.length === 0 && (
            <motion.div variants={fadeUp} className="rounded-2xl bg-card p-10 text-center">
              <UsersGroupTwoRoundedBold size={40} color="currentColor" className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nenhum grupo ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Crie um grupo ou entre com um código de convite!</p>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
