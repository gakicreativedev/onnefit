import { useState, useCallback, lazy, Suspense } from "react";
import type { AppRole } from "@/modules/auth/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HeartBold, ChatRoundBold, LinkBold, AddCircleBold, PenBold, WidgetBold, CloseCircleBold, BoltBold, FireBold, CupStarBold, StarBold, WaterdropsBold, DumbbellBold, ChefHatBold, SettingsLinear, TrashBin2Bold, VerifiedCheckBold, BookmarkBold } from "solar-icon-set";
import RecipeDetailDialog from "@/modules/diet/components/RecipeDetailDialog";
import { PostDetailDialog } from "@/modules/social/components/PostDetailDialog";
import type { Recipe } from "@/modules/diet/hooks/useRecipes";
import { Progress } from "@/components/ui/progress";
import { calculateProteinTarget, calculateWaterTargetMl, getProteinMultiplier, calculateBMR, calculateCalorieTarget } from "@/lib/nutrition";
import { StoryViewer } from "@/modules/social/components/StoryViewer";
import type { Profile } from "@/modules/auth/hooks/useProfile";

const GamificationPage = lazy(() => import("@/modules/gamification/pages/GamificationPage"));
import { EditProfileDialog } from "@/modules/profile/components/EditProfileDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProfileData, type UserPost } from "@/modules/profile/hooks/useProfileData";
import type { StoryGroup } from "@/modules/social/hooks/useStories";

const SOURCE_ICONS: Record<string, any> = {
  workout_completed: DumbbellBold,
  diet_logged: ChefHatBold,
  water_goal: WaterdropsBold,
  streak_bonus_3: FireBold,
  streak_bonus_7: FireBold,
  streak_bonus_30: CupStarBold,
};

const SOURCE_LABELS: Record<string, string> = {
  workout_completed: "Treino completo",
  diet_logged: "Dieta registrada",
  water_goal: "Meta de água",
  streak_bonus_3: "Streak 3 dias",
  streak_bonus_7: "Streak 7 dias",
  streak_bonus_30: "Streak 30 dias",
};

interface ProfilePageProps {
  profile: Profile;
  onUpdate: (data: Partial<Profile>) => Promise<{ data: any; error: any; } | undefined>;
  userRole?: AppRole;
  onSwitchRole?: (role: AppRole) => void;
}

const goalLabels: Record<string, string> = { lose_weight: "Perder Peso", gain_muscle: "Ganhar Músculo", recomposition: "Recomposição", maintain: "Manter" };
const activityLabels: Record<string, string> = { sedentary: "Sedentário", light: "Leve", moderate: "Moderado", active: "Ativo", very_active: "Muito Ativo" };

function ProfileTagField({ label, hint, tags, onChange, placeholder }: { label: string; hint: string; tags: string[]; onChange: (t: string[]) => void; placeholder: string; }) {
  const [input, setInput] = useState("");
  const addTag = () => { const val = input.trim(); if (val && !tags.includes(val)) onChange([...tags, val]); setInput(""); };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder={placeholder} maxLength={60} className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!input.trim()}>+</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {tag}
              <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-destructive transition-colors"><CloseCircleBold size={12} color="currentColor" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ profile, onUpdate, userRole, onSwitchRole }: ProfilePageProps) {
  const pd = useProfileData(profile);
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "info" | "xp" | "recipes" | "workouts" | "conquistas">("posts");
  const [recipeSubTab, setRecipeSubTab] = useState<"mine" | "saved">("mine");
  const [workoutSubTab, setWorkoutSubTab] = useState<"mine" | "saved">("mine");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [highlightDialog, setHighlightDialog] = useState<{ open: boolean; editing?: { id: string; label: string; icon: string; }; }>({ open: false });
  const [highlightForm, setHighlightForm] = useState({ label: "", icon: "" });
  const [viewingStory, setViewingStory] = useState<StoryGroup | null>(null);

  const username = profile.username || profile.name || "athlete";
  const displayName = profile.name || "Athlete";

  const openHighlightDialog = useCallback((highlight?: { id: string; label: string; icon: string; }) => {
    if (highlight) { setHighlightForm({ label: highlight.label, icon: highlight.icon }); setHighlightDialog({ open: true, editing: highlight }); }
    else { setHighlightForm({ label: "", icon: "" }); setHighlightDialog({ open: true }); }
  }, []);

  return (
    <div className="flex flex-col gap-0 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground transition-colors w-8">
          <SettingsLinear size={22} color="currentColor" />
        </button>
        <div className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 w-auto">
          <BoltBold size={14} color="currentColor" className="text-primary" />
          <span className="text-xs font-black text-primary">Lv {pd.level.level}</span>
        </div>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-5 px-5 pt-2 pb-5">
        <div className="flex items-center justify-center gap-6 w-full max-w-[280px]">
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-black text-foreground leading-none">{pd.followersCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Seguidores</p>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => pd.myStoryGroup ? setViewingStory(pd.myStoryGroup) : pd.handleAddStory()}
              className={`h-[88px] w-[88px] rounded-full overflow-hidden bg-card flex items-center justify-center ${pd.hasMyStory ? "ring-[3px] ring-primary ring-offset-2 ring-offset-background" : "ring-[3px] ring-foreground/20 ring-offset-2 ring-offset-background"}`}>
              {profile.avatar_url ?
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> :
                <span className="text-4xl font-black text-primary">{displayName.charAt(0).toUpperCase()}</span>
              }
            </button>
            <button onClick={pd.handleAddStory} className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg border-2 border-background">
              <AddCircleBold size={14} color="currentColor" />
            </button>
          </div>
          <div className="text-center min-w-[60px]">
            <p className="text-lg font-black text-foreground leading-none">{pd.followingCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">Seguindo</p>
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
            {profile.is_verified && <VerifiedCheckBold size={16} color="hsl(var(--primary))" />}
          </div>
          {profile.goal && <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-semibold text-primary">{goalLabels[profile.goal] || profile.goal}</span>}
          {profile.bio && <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-snug">{profile.bio}</p>}
          <p className="flex items-center justify-center gap-1 text-xs text-primary/70"><LinkBold size={11} color="currentColor" /><span>onnefit.lovable.app</span></p>
        </div>

        <div className="flex gap-2.5 w-full max-w-[280px]">
          <Button variant="outline" className="flex-1 rounded-xl font-bold text-sm h-9" onClick={() => setEditOpen(true)}>Editar perfil</Button>
          <Button variant="outline" className="flex-1 rounded-xl font-bold text-sm h-9" onClick={() => navigate("/settings")}>Configurações</Button>
        </div>
      </div>

      {/* Story highlights */}
      <div className="flex items-center gap-5 px-5 py-3 border-b border-border overflow-x-auto">
        {pd.highlights.map((h) => (
          <div key={h.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer select-none" onClick={() => openHighlightDialog(h)}>
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-primary/40 bg-card text-xl relative group">
              {h.icon}
              <div className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PenBold size={13} color="currentColor" className="text-foreground" />
              </div>
            </div>
            <span className="text-[10px] text-foreground font-medium max-w-[60px] truncate">{h.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => openHighlightDialog()}>
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <AddCircleBold size={20} color="currentColor" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Novo</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-2">
        {[
          { key: "posts" as const, Icon: WidgetBold },
          { key: "recipes" as const, Icon: ChefHatBold },
          { key: "workouts" as const, Icon: DumbbellBold },
          { key: "info" as const, Icon: StarBold },
          { key: "xp" as const, Icon: BoltBold },
          { key: "conquistas" as const, Icon: CupStarBold },
        ].map(({ key, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Icon size={18} color="currentColor" />
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <div className="grid grid-cols-3 gap-0.5">
          {pd.userPosts.length === 0 ? (
            <div className="col-span-3 py-16 text-center"><p className="text-sm text-muted-foreground">Nenhuma publicação ainda</p></div>
          ) : pd.userPosts.map((post) => (
            <div key={post.id} onClick={() => pd.openPostDetail(post)} className={`aspect-square flex items-center justify-center p-1 cursor-pointer hover:opacity-80 transition-opacity relative group overflow-hidden ${post.image_url ? "" : "bg-muted"}`}>
              {post.image_url ? <img src={post.image_url} alt="" className="w-full h-full object-cover" /> : <p className="text-xs text-foreground text-center line-clamp-3 font-medium px-2">{post.content}</p>}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <span className="flex items-center gap-1 text-foreground text-xs font-semibold"><HeartBold size={14} color="currentColor" /> {post.likes_count}</span>
                <span className="flex items-center gap-1 text-foreground text-xs font-semibold"><ChatRoundBold size={14} color="currentColor" /> {post.comments_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipes tab */}
      {activeTab === "recipes" && (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setRecipeSubTab("mine")} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${recipeSubTab === "mine" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>Minhas ({pd.myRecipes.length})</button>
            <button onClick={() => setRecipeSubTab("saved")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${recipeSubTab === "saved" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}><BookmarkBold size={14} color="currentColor" />Salvas ({pd.savedRecipes.length})</button>
          </div>
          {(() => {
            const list = recipeSubTab === "mine" ? pd.myRecipes : pd.savedRecipes;
            if (list.length === 0) return (
              <div className="rounded-2xl bg-card p-8 text-center">
                <ChefHatBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">{recipeSubTab === "mine" ? "Nenhuma receita criada ainda" : "Nenhuma receita salva ainda"}</p>
              </div>
            );
            return (
              <div className="grid grid-cols-2 gap-3">
                {list.map((r: any) => (
                  <div key={r.id} className="rounded-2xl bg-card overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={async () => { const { data } = await supabase.from("recipes").select("*").eq("id", r.id).single(); if (data) { setSelectedRecipe(data as Recipe); setRecipeDialogOpen(true); } }}>
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                      {r.image_url ? <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /> : <ChefHatBold size={28} color="currentColor" className="text-muted-foreground" />}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-bold text-card-foreground line-clamp-1">{r.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.calories || 0} kcal · {r.protein || 0}g prot</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Workouts tab */}
      {activeTab === "workouts" && (
        <div className="p-4 space-y-4">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setWorkoutSubTab("mine")} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${workoutSubTab === "mine" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>Meus ({pd.myWorkouts.length})</button>
            <button onClick={() => setWorkoutSubTab("saved")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${workoutSubTab === "saved" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}><BookmarkBold size={14} color="currentColor" />Salvos ({pd.savedWorkouts.length})</button>
          </div>
          {(() => {
            const list = workoutSubTab === "mine" ? pd.myWorkouts : pd.savedWorkouts;
            if (list.length === 0) return (
              <div className="rounded-2xl bg-card p-8 text-center">
                <DumbbellBold size={32} color="currentColor" className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">{workoutSubTab === "mine" ? "Nenhum treino criado ainda" : "Nenhum treino salvo ainda"}</p>
              </div>
            );
            return (
              <div className="space-y-3">
                {list.map((w: any) => (
                  <div key={w.id} className="rounded-2xl bg-card p-5 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center"><DumbbellBold size={20} color="currentColor" className="text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-card-foreground truncate">{w.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {w.difficulty && <span className="capitalize">{w.difficulty}</span>}
                          {w.duration_minutes && <span>· {w.duration_minutes} min</span>}
                          {w.is_shared && <span className="text-primary font-semibold">· Compartilhado</span>}
                        </div>
                      </div>
                    </div>
                    {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                    {w.muscle_groups && w.muscle_groups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">{w.muscle_groups.map((mg: string) => <span key={mg} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary">{mg}</span>)}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Info tab */}
      {activeTab === "info" && (
        <div className="p-4 sm:p-6 space-y-4">
          <Card className="border-0 bg-card rounded-2xl">
            <CardHeader><CardTitle className="text-card-foreground">Informações Pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={pd.form.name} onChange={(e) => pd.setForm({ ...pd.form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Idade</Label><Input type="number" value={pd.form.age} onChange={(e) => pd.setForm({ ...pd.form, age: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Sexo Biológico</Label>
                  <Select value={pd.form.gender} onValueChange={(v) => pd.setForm({ ...pd.form, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">Masculino</SelectItem><SelectItem value="female">Feminino</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" value={pd.form.height_cm} onChange={(e) => pd.setForm({ ...pd.form, height_cm: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" value={pd.form.weight_kg} onChange={(e) => pd.setForm({ ...pd.form, weight_kg: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Objetivo</Label>
                  <Select value={pd.form.goal} onValueChange={(v) => pd.setForm({ ...pd.form, goal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="lose_weight">Perder Peso</SelectItem><SelectItem value="gain_muscle">Ganhar Músculo</SelectItem><SelectItem value="recomposition">Recomposição Corporal</SelectItem><SelectItem value="maintain">Manter</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Nível de Atividade</Label>
                  <Select value={pd.form.activity_level} onValueChange={(v) => pd.setForm({ ...pd.form, activity_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sedentary">Sedentário</SelectItem><SelectItem value="light">Leve</SelectItem><SelectItem value="moderate">Moderado</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="very_active">Muito Ativo</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => pd.handleSave(onUpdate)} disabled={pd.saving} className="w-full rounded-xl py-3 font-bold">{pd.saving ? "Salvando..." : "Salvar Alterações"}</Button>
            </CardContent>
          </Card>

          {/* Calculated targets */}
          {(() => {
            const w = pd.form.weight_kg || 70;
            const goalKey = pd.form.goal || "maintain";
            const actKey = pd.form.activity_level || "moderate";
            const protMult = getProteinMultiplier(goalKey);
            const protTarget = calculateProteinTarget(w, goalKey);
            const waterMl = calculateWaterTargetMl(w, actKey);
            const waterL = (waterMl / 1000).toFixed(1);
            const bmr = calculateBMR(pd.form.gender, w, pd.form.height_cm || 175, pd.form.age || 25);
            const calTarget = calculateCalorieTarget(bmr, actKey, goalKey);
            const goalLabel: Record<string, string> = { gain_muscle: "Ganho muscular (1.6g/kg)", lose_weight: "Perda de peso (1.4g/kg)", recomposition: "Recomposição (1.6g/kg)", maintain: "Manutenção (1.2g/kg)" };
            const actLabel: Record<string, string> = { very_active: "Muito ativo (×1.3)", active: "Ativo (×1.15)", moderate: "Moderado (×1.0)", light: "Leve (×0.95)", sedentary: "Sedentário (×0.9)" };
            return (
              <Card className="border-0 bg-card rounded-2xl">
                <CardHeader><CardTitle className="text-card-foreground flex items-center gap-2"><StarBold size={20} color="currentColor" className="text-primary" />Metas Calculadas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">Valores calculados automaticamente com base nos seus dados.</p>
                  <div className="rounded-xl bg-background p-4 space-y-1">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-card-foreground">Calorias diárias</span><span className="text-lg font-bold text-primary">{calTarget.toLocaleString("pt-BR")} kcal</span></div>
                    <p className="text-xs text-muted-foreground">TMB ({Math.round(bmr)} kcal) × atividade × objetivo</p>
                  </div>
                  <div className="rounded-xl bg-background p-4 space-y-1">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><DumbbellBold size={14} color="currentColor" className="text-primary" />Meta de Proteína</span><span className="text-lg font-bold text-primary">{protTarget}g/dia</span></div>
                    <p className="text-xs text-muted-foreground">{w}kg × {protMult}g/kg — {goalLabel[goalKey] || goalLabel.maintain}</p>
                  </div>
                  <div className="rounded-xl bg-background p-4 space-y-1">
                    <div className="flex items-center justify-between"><span className="text-sm font-semibold text-card-foreground flex items-center gap-1.5"><WaterdropsBold size={14} color="currentColor" className="text-primary" />Meta de Água</span><span className="text-lg font-bold text-primary">{waterL}L/dia</span></div>
                    <p className="text-xs text-muted-foreground">{w}kg × 35ml × {actLabel[actKey] || actLabel.moderate}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card className="border-0 bg-card rounded-2xl">
            <CardHeader><CardTitle className="text-card-foreground">Saúde & Restrições</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <ProfileTagField label="Lesões ou Limitações Físicas" hint="Ex: hérnia de disco, tendinite no ombro" tags={pd.form.injuries} onChange={(t) => pd.setForm({ ...pd.form, injuries: t })} placeholder="Adicionar lesão..." />
              <ProfileTagField label="Alergias Alimentares" hint="Ex: lactose, glúten, amendoim" tags={pd.form.allergies} onChange={(t) => pd.setForm({ ...pd.form, allergies: t })} placeholder="Adicionar alergia..." />
              <ProfileTagField label="Restrições Alimentares" hint="Ex: vegetariano, vegano, sem açúcar" tags={pd.form.dietary_restrictions} onChange={(t) => pd.setForm({ ...pd.form, dietary_restrictions: t })} placeholder="Adicionar restrição..." />
              <p className="text-xs text-muted-foreground text-center">Dados privados usados pela IA para personalizar treinos e dietas.</p>
              <Button onClick={() => pd.handleSave(onUpdate)} disabled={pd.saving} className="w-full rounded-xl py-3 font-bold">{pd.saving ? "Salvando..." : "Salvar Alterações"}</Button>
            </CardContent>
          </Card>

          {onSwitchRole && (
            <Card className="border-0 bg-card rounded-2xl">
              <CardHeader><CardTitle className="text-card-foreground">Tipo de Conta</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{userRole === "professional" ? "Você está no modo Personal Trainer." : "Mude para modo profissional para acessar o painel de Personal Trainer."}</p>
                <Button variant={userRole === "professional" ? "outline" : "default"} onClick={() => onSwitchRole(userRole === "professional" ? "athlete" : "professional")} className="w-full rounded-xl py-3 font-bold">{userRole === "professional" ? "Voltar para Modo Atleta" : "Ativar Modo Personal Trainer"}</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* XP tab */}
      {activeTab === "xp" && (
        <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-6">
          <section className="relative flex flex-col gap-4 rounded-[24px] bg-primary p-6 overflow-hidden">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-primary-foreground/70 text-xs font-bold uppercase tracking-wider">Seu Nível</p>
                <h2 className="text-4xl font-black text-primary-foreground">Level {String(pd.level.level).padStart(2, "0")}</h2>
              </div>
              <div className="flex items-center gap-2">
                <BoltBold size={20} color="currentColor" className="text-primary-foreground" />
                <span className="text-xl font-black text-primary-foreground">{pd.level.totalXP} XP</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-primary-foreground/70 font-bold">
                <span>{pd.level.totalXP - pd.level.currentThreshold} / {pd.level.nextThreshold - pd.level.currentThreshold} XP</span>
                <span>Level {pd.level.level + 1}</span>
              </div>
              <Progress value={pd.level.progress} className="h-3 bg-primary-foreground/20 [&>div]:bg-primary-foreground" />
            </div>
          </section>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-card p-4 border border-border"><FireBold size={24} color="currentColor" className="text-primary" /><span className="text-2xl font-black text-card-foreground">{pd.streak.current_streak}</span><span className="text-[10px] text-muted-foreground font-bold">Streak</span></div>
            <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-card p-4 border border-border"><CupStarBold size={24} color="currentColor" className="text-primary" /><span className="text-2xl font-black text-card-foreground">{pd.streak.longest_streak}</span><span className="text-[10px] text-muted-foreground font-bold">Recorde</span></div>
            <div className="flex flex-col items-center gap-1.5 rounded-[16px] bg-card p-4 border border-border"><StarBold size={24} color="currentColor" className="text-primary" /><span className="text-2xl font-black text-card-foreground">{pd.xpHistory.length}</span><span className="text-[10px] text-muted-foreground font-bold">Ações</span></div>
          </div>

          <section className="flex flex-col gap-3 rounded-[24px] bg-card p-5 border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-card-foreground">Histórico de XP</h3>
              <BoltBold size={22} color="currentColor" className="text-primary" />
            </div>
            {pd.xpHistory.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhum XP ganho ainda</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pd.xpHistory.slice(0, 20).map((entry) => {
                  const Icon = SOURCE_ICONS[entry.source] || StarBold;
                  return (
                    <div key={entry.id} className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15"><Icon size={16} color="currentColor" className="text-primary" /></div>
                        <div>
                          <p className="text-xs font-bold text-card-foreground">{SOURCE_LABELS[entry.source] || entry.source}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-primary">+{entry.amount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Conquistas tab */}
      {activeTab === "conquistas" && (
        <div className="p-4">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }>
            <GamificationPage />
          </Suspense>
        </div>
      )}


      {/* Recipe detail dialog */}
      <RecipeDetailDialog recipe={selectedRecipe} open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen} />

      {/* Highlight dialog */}
      <Dialog open={highlightDialog.open} onOpenChange={(open) => !open && setHighlightDialog({ open: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{highlightDialog.editing ? "Editar Destaque" : "Novo Destaque"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Ícone</Label><Input value={highlightForm.icon} onChange={(e) => setHighlightForm({ ...highlightForm, icon: e.target.value })} placeholder="Ex: 🏋️" maxLength={4} /></div>
            <div className="space-y-2"><Label>Nome</Label><Input value={highlightForm.label} onChange={(e) => setHighlightForm({ ...highlightForm, label: e.target.value })} placeholder="Ex: Treinos" maxLength={20} /></div>
          </div>
          <DialogFooter className="flex-row gap-2">
            {highlightDialog.editing && <Button variant="destructive" onClick={() => { pd.handleDeleteHighlight(highlightDialog.editing!.id); setHighlightDialog({ open: false }); }} className="mr-auto"><TrashBin2Bold size={16} color="currentColor" className="mr-1" /> Remover</Button>}
            <Button variant="secondary" onClick={() => setHighlightDialog({ open: false })}>Cancelar</Button>
            <Button onClick={() => { pd.saveHighlight(highlightForm, highlightDialog.editing?.id); setHighlightDialog({ open: false }); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story viewer */}
      <StoryViewer group={viewingStory} onClose={() => setViewingStory(null)} />

      {/* Hidden story file input */}
      <input ref={pd.storyInputRef} type="file" accept="image/*" className="hidden" onChange={pd.handleStoryFile} />
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pd.handleStoryFile} />

      {/* Edit profile dialog */}
      <EditProfileDialog open={editOpen} onClose={() => setEditOpen(false)} profile={profile} onSave={onUpdate} />

      <PostDetailDialog
        post={pd.detailPost}
        open={!!pd.detailPost}
        onOpenChange={(v) => { if (!v) pd.setDetailPost(null); }}
        onLike={pd.handleDetailLike}
        onBookmark={pd.handleDetailBookmark}
        onEdit={pd.handleDetailEdit}
        onDelete={pd.handleDetailDelete}
        onCommentCountChange={pd.handleDetailCommentCount}
      />
    </div>
  );
}