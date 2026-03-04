import { useState, useRef, useEffect, useCallback } from "react";
import { useAIChat, parseAllDietJsons, stripJsonTags } from "@/modules/ai/hooks/useAIChat";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BoltCircleBold, PlainBold, TrashBinTrashBold, ChefHatHeartBold,
  DisketteBold, PenBold, AltArrowDownBold, AltArrowUpBold, ChefHatBold
} from "solar-icon-set";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

const SUGGESTIONS = [
  "Monte um cardápio de 1 dia completo para mim",
  "Preciso de opções de café da manhã proteico",
  "Sugira lanches saudáveis para o pós-treino",
  "Crie um plano alimentar semanal completo",
];

const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
};

interface SavedMealPlan {
  id: string;
  date: string;
  total_calories: number | null;
  meals: SavedMeal[];
}

interface SavedMeal {
  id: string;
  name: string;
  meal_time: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export default function DietAIPage() {
  const { messages, isLoading, send, clear } = useAIChat("dietai");
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; meal: SavedMeal | null }>({ open: false, meal: null });
  const [editForm, setEditForm] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const fetchSavedPlans = useCallback(async () => {
    if (!user) return;
    const { data: plans } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!plans) return;

    const withMeals = await Promise.all(
      plans.map(async (p) => {
        const { data: meals } = await supabase
          .from("meals")
          .select("*")
          .eq("meal_plan_id", p.id);
        return { ...p, meals: (meals || []) as SavedMeal[] } as SavedMealPlan;
      })
    );
    setSavedPlans(withMeals);
  }, [user]);

  useEffect(() => { fetchSavedPlans(); }, [fetchSavedPlans]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    send(input.trim());
    setInput("");
  };

  const handleSaveDiet = async (content: string) => {
    if (!user) return;
    const allPlans = parseAllDietJsons(content);
    if (!allPlans || allPlans.length === 0) { toast.error("Não encontrei dados estruturados nesta resposta para salvar."); return; }

    setSaving(true);
    try {
      let savedCount = 0;
      for (const parsed of allPlans) {
        const today = format(new Date(), "yyyy-MM-dd");
        const planName = parsed.day_label || parsed.name || `Plano ${savedCount + 1}`;

        const { data: plan, error } = await supabase
          .from("meal_plans")
          .insert({
            user_id: user.id,
            date: today,
            total_calories: parsed.total_calories || 0,
          })
          .select("id")
          .single();

        if (error || !plan) throw error;

        if (parsed.meals?.length) {
          await supabase.from("meals").insert(
            parsed.meals.map((m: any) => ({
              meal_plan_id: plan.id,
              name: m.name,
              meal_time: m.meal_time || null,
              calories: m.calories || 0,
              protein: m.protein || 0,
              carbs: m.carbs || 0,
              fat: m.fat || 0,
            }))
          );
        }
        savedCount++;
      }

      toast.success(`${savedCount} plano(s) alimentar(es) salvo(s)!`);
      fetchSavedPlans();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar plano alimentar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    await supabase.from("meals").delete().eq("meal_plan_id", planId);
    await supabase.from("meal_plans").delete().eq("id", planId);
    toast.success("Plano excluído");
    fetchSavedPlans();
  };

  const openEditMeal = (meal: SavedMeal) => {
    setEditForm({ name: meal.name, calories: meal.calories || 0, protein: meal.protein || 0, carbs: meal.carbs || 0, fat: meal.fat || 0 });
    setEditDialog({ open: true, meal });
  };

  const handleUpdateMeal = async () => {
    if (!editDialog.meal) return;
    await supabase.from("meals").update({
      name: editForm.name,
      calories: editForm.calories,
      protein: editForm.protein,
      carbs: editForm.carbs,
      fat: editForm.fat,
    }).eq("id", editDialog.meal.id);
    setEditDialog({ open: false, meal: null });
    toast.success("Refeição atualizada");
    fetchSavedPlans();
  };

  const handleDeleteMeal = async (mealId: string) => {
    await supabase.from("meals").delete().eq("id", mealId);
    toast.success("Refeição removida");
    fetchSavedPlans();
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const canSave = lastAssistant && parseAllDietJsons(lastAssistant.content) && !isLoading;

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
              <ChefHatHeartBold size={24} color="currentColor" className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>DietAI</h1>
              <p className="text-xs text-muted-foreground">Seu nutricionista inteligente</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
              <TrashBinTrashBold size={16} color="currentColor" className="mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Chat card (messages + input combined) */}
        <div className="rounded-[20px] sm:rounded-[28px] bg-card overflow-hidden flex flex-col">
          <div ref={scrollRef} className="h-[40vh] sm:h-[45vh] overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <BoltCircleBold size={40} color="currentColor" className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">Olá! Sou o DietAI 🥗</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Já conheço suas alergias, restrições e meta calórica. Me diga o que precisa e eu monto o plano alimentar ideal!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="rounded-full bg-muted px-4 py-2 text-xs font-medium text-card-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-card-foreground rounded-bl-md"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{stripJsonTags(msg.content)}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Pensando...
                </div>
              </div>
            )}
          </div>

          {/* Save button inline */}
          {canSave && (
            <div className="px-3 sm:px-6 pb-2">
              <Button onClick={() => handleSaveDiet(lastAssistant!.content)} disabled={saving} className="rounded-2xl py-3 font-bold w-full">
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-card border-t-transparent mr-2" /> : <DisketteBold size={18} color="currentColor" className="mr-2" />}
                Salvar Plano Alimentar
              </Button>
            </div>
          )}

          {/* Input inside card */}
          <div className="flex gap-2 px-3 sm:px-6 pb-3 sm:pb-6 pt-2 border-t border-border/30">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Descreva a dieta ou refeição que você precisa..."
              className="flex-1 rounded-xl bg-muted/50 px-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl h-auto px-4">
              <PlainBold size={20} color="currentColor" />
            </Button>
          </div>
        </div>

        {/* Saved Plans */}
        {savedPlans.length > 0 && (
          <section className="rounded-[20px] sm:rounded-[28px] bg-card p-3 sm:p-6">
            <h3 className="text-xl font-black text-card-foreground mb-4" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              Meus Planos Salvos
            </h3>
            <div className="space-y-3">
              {savedPlans.map((p) => {
                const isExpanded = expandedPlan === p.id;
                const totalCal = p.meals.reduce((s, m) => s + (m.calories || 0), 0);
                return (
                  <div key={p.id} className="rounded-2xl bg-muted/50 overflow-hidden">
                    <button onClick={() => setExpandedPlan(isExpanded ? null : p.id)} className="flex items-center justify-between w-full px-5 py-4 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <ChefHatBold size={20} color="currentColor" className="text-primary shrink-0" />
                        <div className="text-left">
                          <h4 className="text-sm font-bold text-card-foreground">Plano {p.date}</h4>
                          <p className="text-xs text-muted-foreground">{p.meals.length} refeições · {totalCal} kcal</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePlan(p.id); }} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                          <TrashBinTrashBold size={16} color="currentColor" />
                        </button>
                        {isExpanded ? <AltArrowUpBold size={14} color="currentColor" className="text-muted-foreground" /> : <AltArrowDownBold size={14} color="currentColor" className="text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-2">
                        {p.meals.map((meal) => (
                          <div key={meal.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-semibold text-card-foreground truncate">{meal.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {MEAL_TIME_LABELS[meal.meal_time || ""] || meal.meal_time} · {meal.calories} kcal · P:{meal.protein}g C:{meal.carbs}g G:{meal.fat}g
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEditMeal(meal)} className="text-muted-foreground hover:text-foreground p-1.5 transition-colors">
                                <PenBold size={14} color="currentColor" />
                              </button>
                              <button onClick={() => handleDeleteMeal(meal.id)} className="text-muted-foreground hover:text-destructive p-1.5 transition-colors">
                                <TrashBinTrashBold size={14} color="currentColor" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Edit Meal Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, meal: null })}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Editar Refeição</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Nome</label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Calorias</label>
                <Input type="number" value={editForm.calories} onChange={(e) => setEditForm({ ...editForm, calories: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Proteína (g)</label>
                <Input type="number" value={editForm.protein} onChange={(e) => setEditForm({ ...editForm, protein: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Carbos (g)</label>
                <Input type="number" value={editForm.carbs} onChange={(e) => setEditForm({ ...editForm, carbs: +e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Gordura (g)</label>
                <Input type="number" value={editForm.fat} onChange={(e) => setEditForm({ ...editForm, fat: +e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateMeal} className="rounded-xl">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
