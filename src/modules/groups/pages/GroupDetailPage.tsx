import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGroupDetail, useGroups, type GroupMember } from "../hooks/useGroups";
import { useGroupFeed, useLeaderboard } from "../hooks/useGroupFeed";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import {
  UsersGroupTwoRoundedBold,
  LinkRoundBold,
  TicketBold,
  SettingsBold,
  AddCircleBold,
  ArrowLeftBold,
  CrownBold,
  TrashBinTrashBold,
  LogoutBold,
  CameraBold,
  CupStarBold,
  TargetBold,
  CalendarMarkBold,
  MedalRibbonBold,
} from "solar-icon-set";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ActivityCard from "../components/ActivityCard";
import LeaderboardTable from "../components/LeaderboardTable";
import SubmitActivityDialog from "../components/SubmitActivityDialog";
import GroupSettingsDialog from "../components/GroupSettingsDialog";
import GroupChatTab from "../components/GroupChatTab";
import GroupGoalsWidget from "../components/GroupGoalsWidget";
import GroupResourcesTab from "../components/GroupResourcesTab";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

type TabType = "feed" | "chat" | "leaderboard" | "members" | "resources";
const TAB_LABELS: Record<TabType, { label: string, icon: React.ReactNode }> = {
  feed: { label: "Feed", icon: <CameraBold size={16} color="currentColor" /> },
  chat: { label: "Chat", icon: <AddCircleBold size={16} color="currentColor" /> }, // Use a proper icon here if preferred
  leaderboard: { label: "Ranking", icon: <CupStarBold size={16} color="currentColor" /> },
  members: { label: "Membros", icon: <UsersGroupTwoRoundedBold size={16} color="currentColor" /> },
  resources: { label: "Mural", icon: <LinkRoundBold size={16} color="currentColor" /> },
};

export default function GroupDetailPage() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const gd = useGroupDetail(groupId);
  const { leaveGroup, deleteGroup, inviteUser, updateGroupSettings, transferAdmin } = useGroups();
  const feed = useGroupFeed(groupId);
  const lb = useLeaderboard(groupId);

  const [activeTab, setActiveTab] = useState<TabType>("feed");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");

  const isAdmin = user && gd.group?.created_by === user.id;
  const isMember = gd.members.some(m => m.user_id === user?.id);

  const handleCopyCode = () => {
    if (gd.group?.invite_code) {
      navigator.clipboard.writeText(gd.group.invite_code);
      toast.success("Código copiado!");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/groups/${groupId}`);
    toast.success("Link copiado!");
  };

  const handleInvite = async () => {
    if (!groupId || !inviteUsername.trim()) return;
    await inviteUser(groupId, inviteUsername);
    setInviteUsername("");
    setInviteOpen(false);
  };

  const handleLeave = async () => {
    if (!groupId) return;
    if (window.confirm("Sair do grupo?")) {
      await leaveGroup(groupId);
      navigate("/groups");
    }
  };

  const handleDelete = async () => {
    if (!groupId) return;
    if (window.confirm("Excluir grupo? Esta ação é irreversível.")) {
      await deleteGroup(groupId);
      navigate("/groups");
    }
  };

  const handleSettingsSave = async (gId: string, settings: any) => {
    await updateGroupSettings(gId, settings);
    gd.refetch();
  };

  if (gd.loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!gd.group) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Grupo não encontrado</p>
        <Button variant="link" onClick={() => navigate("/groups")}>Voltar</Button>
      </div>
    );
  }

  const scoreRules = gd.group.score_rules || { type: "per_workout" as const, value: 1 };

  return (
    <motion.div
      className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-24"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start gap-3">
        <button onClick={() => navigate("/groups")} className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <ArrowLeftBold size={18} color="currentColor" className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground truncate">{gd.group.name}</h1>
            {gd.group.group_type === "challenge" && (
              <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px] font-bold">DESAFIO</Badge>
            )}
          </div>
          {gd.group.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{gd.group.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <UsersGroupTwoRoundedBold size={14} color="currentColor" className="shrink-0" /> {gd.members.length} membros
            </span>
            {gd.group.group_type === "challenge" && gd.group.end_date && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarMarkBold size={14} color="currentColor" className="shrink-0" /> até {new Date(gd.group.end_date).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 shrink-0">
          {isAdmin && gd.group?.group_type === "challenge" && !gd.challengeClosed && (
            <Button
              size="sm"
              variant="default"
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full h-8 px-3 py-1 font-bold text-[11px]"
              onClick={() => gd.closeChallenge(lb.entries)}
            >
              <MedalRibbonBold size={14} color="currentColor" className="mr-1" />
              Encerrar Desafio
            </Button>
          )}

          <button onClick={handleCopyCode} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors" title="Copiar código">
            <TicketBold size={14} color="currentColor" className="text-foreground" />
          </button>
          <button onClick={handleCopyLink} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors" title="Copiar link">
            <LinkRoundBold size={14} color="currentColor" className="text-foreground" />
          </button>
          {isAdmin && (
            <button onClick={() => setSettingsOpen(true)} className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors" title="Configurações">
              <SettingsBold size={14} color="currentColor" className="text-primary" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Scoring info */}
      <motion.div variants={fadeUp} className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-2.5 flex items-center gap-2">
        <TargetBold size={20} className="text-primary shrink-0" color="currentColor" />
        <span className="text-xs text-muted-foreground">
          Pontuação: {" "}
          <span className="text-primary font-bold">
            {scoreRules.type === "per_workout" && `${scoreRules.value ?? 1} pt por treino`}
            {scoreRules.type === "distance_km" && `${scoreRules.value ?? 1} pt por km`}
            {scoreRules.type === "duration_min" && `${scoreRules.value ?? 1} pt por minuto`}
            {scoreRules.type === "calories" && `${scoreRules.value ?? 0.01} pt por caloria`}
            {scoreRules.type === "steps" && `${scoreRules.value ?? 0.001} pt por passo`}
            {scoreRules.type === "custom" && `${scoreRules.rules?.length || 0} regras personalizadas`}
          </span>
        </span>
      </motion.div>

      {/* Goal Progress Bar Widget */}
      <motion.div variants={fadeUp}>
        <GroupGoalsWidget
          goals={gd.goals || []}
          isAdmin={isAdmin}
          onCreateGoal={gd.createGoal}
          onDeleteGoal={gd.deleteGoal}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(Object.entries(TAB_LABELS) as [TabType, { label: string, icon: React.ReactNode }][]).map(([key, tab]) => (
          <Badge
            key={key}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-colors border flex items-center gap-1.5 ${activeTab === key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              }`}
            onClick={() => setActiveTab(key)}
          >
            {tab.icon}
            {tab.label}
          </Badge>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={fadeUp}>
        {/* ─── Feed ─── */}
        {activeTab === "feed" && (
          <div className="space-y-3">
            {feed.loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : feed.activities.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-card">
                <span className="text-foreground flex justify-center mb-3"><CameraBold size={48} color="currentColor" /></span>
                <p className="text-muted-foreground font-medium">Nenhuma atividade ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Registre seu primeiro treino!</p>
              </div>
            ) : (
              <>
                {feed.activities.map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isOwnActivity={activity.user_id === user?.id}
                    availableEmojis={feed.AVAILABLE_EMOJIS}
                    onReaction={feed.toggleReaction}
                    onDelete={feed.deleteActivity}
                    onFetchComments={feed.fetchComments}
                    onAddComment={feed.addComment}
                    onDeleteComment={feed.deleteComment}
                    currentUserId={user?.id || ""}
                  />
                ))}
                {feed.hasMore && (
                  <Button variant="ghost" className="w-full" onClick={feed.fetchMore} disabled={feed.loadingMore}>
                    {feed.loadingMore ? "Carregando..." : "Carregar mais"}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Chat ─── */}
        {activeTab === "chat" && (
          <GroupChatTab groupId={groupId || ""} />
        )}

        {/* ─── Leaderboard ─── */}
        {activeTab === "leaderboard" && (
          <LeaderboardTable
            entries={lb.entries}
            loading={lb.loading}
            filter={lb.filter}
            onFilterChange={lb.setFilter}
            currentUserId={user?.id || ""}
          />
        )}

        {/* ─── Members ─── */}
        {activeTab === "members" && (
          <div className="space-y-2">
            {/* Invite button */}
            {isAdmin && (
              <Button variant="outline" className="w-full rounded-xl mb-3" onClick={() => setInviteOpen(true)}>
                <AddCircleBold size={16} color="currentColor" className="mr-2" />
                Convidar Membro
              </Button>
            )}

            {gd.members.map((m: GroupMember) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {m.profile?.avatar_url ? (
                    <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {(m.profile?.name || "U")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground truncate">{m.profile?.name || "Usuário"}</p>
                    {m.role === "admin" && <CrownBold size={12} color="currentColor" className="text-amber-500 shrink-0" />}
                  </div>
                  {m.profile?.username && (
                    <p className="text-[11px] text-muted-foreground">@{m.profile.username}</p>
                  )}
                </div>
                {m.user_id === user?.id && (
                  <span className="text-[10px] text-primary font-bold bg-primary/10 rounded-full px-2 py-0.5">Você</span>
                )}
              </div>
            ))}

            {/* Leave / Delete */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" className="flex-1 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLeave}>
                <LogoutBold size={14} color="currentColor" className="mr-2" />
                Sair
              </Button>
              {isAdmin && (
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDelete}>
                  <TrashBinTrashBold size={14} color="currentColor" className="mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── Resources (Mural) ─── */}
        {activeTab === "resources" && (
          <GroupResourcesTab
            resources={gd.resources || []}
            isAdmin={isAdmin}
            onCreateResource={gd.createResource}
            onDeleteResource={gd.deleteResource}
          />
        )}
      </motion.div>

      {/* Floating Submit Button */}
      {isMember && (
        <button
          onClick={() => setSubmitOpen(true)}
          className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <AddCircleBold size={28} color="currentColor" />
        </button>
      )}

      {/* Submit Activity Dialog */}
      <SubmitActivityDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        scoreRules={scoreRules}
        onSubmit={feed.submitActivity}
      />

      {/* Settings Dialog */}
      {isAdmin && gd.group && (
        <GroupSettingsDialog
          group={gd.group}
          members={gd.members}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={handleSettingsSave}
          onTransferAdmin={transferAdmin}
          currentUserId={user?.id || ""}
        />
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="@username" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleInvite} disabled={!inviteUsername.trim()}>Convidar</Button>
              <Button variant="outline" className="flex-1" onClick={handleCopyCode}>📋 Copiar Código</Button>
            </div>
            {gd.group?.invite_code && (
              <p className="text-center text-xs text-muted-foreground">
                Código: <span className="font-mono text-foreground font-bold">{gd.group.invite_code}</span>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
