import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAIChat, parseAllDietJsons, stripJsonTags } from "@/modules/ai/hooks/useAIChat";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ChefHatBold, MagniferBold, AddCircleBold, AltArrowDownBold, AltArrowUpBold,
  TrashBinTrashBold, BoltCircleBold, ChefHatHeartBold, AltArrowRightBold, StarBold, WalletMoneyBold,
  BookmarkBold, SunBold, Widget4Bold, CupHotBold, MoonBold, ClipboardTextBold, TagBold,
  HeartBold, MinimalisticMagniferBold, GlobalBold
} from "solar-icon-set";
import { useRecipes, useRecipeBookmarks, type Recipe } from "../hooks/useRecipes";
import RecipeDetailDialog from "../components/RecipeDetailDialog";
import CreateRecipeDialog from "../components/CreateRecipeDialog";
import EditRecipeDialog from "../components/EditRecipeDialog";
import CommunityFoodsDialog from "../components/CommunityFoodsDialog";
import { useDietTracker } from "../hooks/useDietTracker";
import { MEAL_TIMES } from "@/lib/types";
import type { SearchFood } from "@/lib/types";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { calculateProteinTarget, calculateWaterTargetL } from "@/lib/nutrition";

interface DietPageProps {
  profile: Profile;
}

const COST_COLORS = ["", "text-green-500", "text-yellow-500", "text-red-500"];

export default function DietPage({ profile }: DietPageProps) {
  const dt = useDietTracker();
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [dietaiPrompt, setDietaiPrompt] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const { messages: aiMessages, isLoading: aiLoading, send: aiSend, clear: aiClear } = useAIChat("dietai");
  const { recipes, loading: recipesLoading, addRecipe, updateRecipe, deleteRecipe, refetch: refetchRecipes } = useRecipes();
  const { isBookmarked, toggle: toggleBookmark } = useRecipeBookmarks();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeTab, setRecipeTab] = useState<"all" | "favorites">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [costFilter, setCostFilter] = useState<string>("all");
  const [showCommunityFoods, setShowCommunityFoods] = useState(false);
  const [addDialog, setAddDialog] = useState<{ open: boolean; mealTime: string }>({ open: false, mealTime: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<SearchFood | null>(null);
  const [quantity, setQuantity] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Wire up search effect to hook
  useEffect(() => {
    dt.searchFoods(searchQuery);
  }, [searchQuery, dt.searchFoods]);

  const openAddDialog = (mealTime: string) => {
    setSearchQuery(""); dt.setSearchResults([]); setSelectedFood(null); setQuantity("");
    setManualMode(false); setManualForm({ name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
    setAddDialog({ open: true, mealTime });
  };

  const handleSelectFood = (food: SearchFood) => {
    setSelectedFood(food); setQuantity(food.serving || "1 porção"); dt.setSearchResults([]); setSearchQuery("");
  };

  const handleSubmitFood = () => {
    if (manualMode) {
      if (!manualForm.name.trim()) { toast.error("Informe o nome do alimento"); return; }
      dt.handleAddFood(addDialog.mealTime, manualForm);
    } else if (selectedFood) {
      dt.handleAddFood(addDialog.mealTime, {
        name: selectedFood.name + (selectedFood.brand ? ` (${selectedFood.brand})` : ""),
        quantity: quantity || selectedFood.serving,
        calories: selectedFood.calories, protein: selectedFood.protein, carbs: selectedFood.carbs, fat: selectedFood.fat,
      });
    } else { toast.error("Selecione um alimento"); return; }
    setAddDialog({ open: false, mealTime: "" });
    toast.success("Alimento adicionado!");
  };

  const calorieTarget = profile.calorie_target || 2500;
  const caloriePercent = Math.min(100, Math.round((dt.totalCalories / calorieTarget) * 100));

  const weightKg = profile.weight_kg || 70;
  const proteinTarget = calculateProteinTarget(weightKg, profile.goal || "maintain");
  const proteinPercent = proteinTarget > 0 ? Math.min(100, Math.round((dt.totalProtein / proteinTarget) * 100)) : 0;

  const waterTargetL = calculateWaterTargetL(weightKg, profile.activity_level || "moderate");
  const waterLiters = dt.waterIntake / 1000;
  const waterPercent = Math.min(100, Math.round((waterLiters / waterTargetL) * 100));

  const metrics = [
    { label: "Calorias", current: dt.totalCalories.toLocaleString("pt-BR"), total: `/${calorieTarget.toLocaleString("pt-BR")}`, percent: caloriePercent },
    { label: "Proteínas", current: `${dt.totalProtein}g`, total: `/${proteinTarget}g`, percent: proteinPercent },
    { label: "Água", current: waterLiters.toFixed(1), total: `/${waterTargetL}L`, percent: waterPercent },
  ];

  const filteredRecipes = recipes.filter((r) => {
    const searchLower = recipeSearch.toLowerCase();
    const matchesSearch = !recipeSearch
      || r.title.toLowerCase().includes(searchLower)
      || (r.ingredients && r.ingredients.some(ing => ing.toLowerCase().includes(searchLower)));
    const matchesTab = recipeTab === "all" || isBookmarked(r.id);
    const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;
    const matchesCost = costFilter === "all" || String(r.cost_level || 1) === costFilter;
    return matchesSearch && matchesTab && matchesCategory && matchesCost;
  });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
  const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } } };

  return (
    <>
      <motion.div className="flex flex-col gap-4 sm:gap-6 max-w-6xl mx-auto" variants={stagger} initial="hidden" animate="show">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* ── Hero: Dieta do Dia ── */}
          <section className="relative flex flex-col gap-4 sm:gap-5 rounded-[20px] sm:rounded-[34px] bg-primary p-4 sm:p-8 lg:p-10 overflow-hidden">
            <div className="flex items-center justify-between">
              <Badge className="bg-primary-foreground text-primary border-0 rounded-full px-4 py-1.5 text-xs font-bold">
                Dieta do Dia
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {metrics.map((m) => (
                <div key={m.label} className="flex flex-col gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-primary-foreground/15 backdrop-blur-sm p-3 sm:p-4">
                  <p className="text-xs text-primary-foreground/70">{m.label}</p>
                  <p className="text-base sm:text-2xl font-black text-primary-foreground">
                    {m.current}<span className="text-[10px] sm:text-sm font-normal text-primary-foreground/60">{m.total}</span>
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-primary-foreground/20">
                    <div className="h-full rounded-full bg-primary-foreground transition-all" style={{ width: `${m.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {[250, 500].map((ml) => (
                <button key={ml} onClick={() => dt.handleAddWater(ml)} className="flex items-center justify-center gap-2 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm px-4 py-3 hover:bg-primary-foreground/25 transition-colors flex-1">
                  <span className="text-base">💧</span>
                  <span className="text-sm font-bold text-primary-foreground">+{ml}ml</span>
                </button>
              ))}
            </div>

            {/* DietAI redirect button */}
            <Button
              className="rounded-2xl py-4 text-sm font-bold w-full bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 border-0"
              onClick={() => window.location.href = '/ai-chef'}
            >
              <BoltCircleBold size={16} color="currentColor" className="mr-2" />
              Gerar Dieta com DietAI
            </Button>
          </section>

          {/* ── Minhas Refeições ── */}
          <section className="flex flex-col gap-4 sm:gap-5 rounded-[20px] sm:rounded-[34px] bg-card p-4 sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                Minhas Refeições
              </h3>
              <ChefHatBold size={28} color="currentColor" className="text-primary" />
            </div>

            <div className="space-y-3">
              {dt.mealSlots.map((slot) => {
                const slotCalories = slot.items.reduce((s, i) => s + i.calories, 0);
                const isExpanded = expandedMeal === slot.key;
                return (
                  <div key={slot.key} className="rounded-2xl bg-muted/50 overflow-hidden">
                    <button onClick={() => setExpandedMeal(isExpanded ? null : slot.key)} className="flex items-center justify-between w-full px-5 py-4 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold text-card-foreground">{slot.label}</h4>
                        <span className="text-xs text-muted-foreground">{slot.items.length} {slot.items.length === 1 ? "item" : "itens"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">{slotCalories} kcal</span>
                        {isExpanded ? <AltArrowUpBold size={14} color="currentColor" className="text-muted-foreground" /> : <AltArrowDownBold size={14} color="currentColor" className="text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-4 space-y-2">
                        {slot.items.length === 0 && <p className="text-sm text-muted-foreground py-2">Nenhum alimento registrado</p>}
                        {slot.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2.5">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-card-foreground truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-primary">{item.calories} kcal</span>
                                <span className="text-[10px] text-muted-foreground">P:{item.protein}g · C:{item.carbs}g · G:{item.fat}g</span>
                              </div>
                              <button onClick={() => dt.handleDeleteFood(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                                <TrashBinTrashBold size={14} color="currentColor" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => openAddDialog(slot.key)} className="flex items-center gap-2 w-full rounded-xl border border-dashed border-muted-foreground/30 px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          <AddCircleBold size={14} color="currentColor" />
                          <span>Adicionar alimento</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <motion.div variants={fadeUp}>
          <section className="rounded-[20px] sm:rounded-[34px] bg-card p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl sm:text-2xl font-black text-card-foreground" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
                  Receitas
                </h3>
                <ChefHatHeartBold size={28} color="currentColor" className="text-primary" />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <MagniferBold size={18} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Buscar por nome ou ingrediente..."
                    className="pl-10 rounded-2xl bg-muted/50 border-0"
                  />
                </div>
                <Button variant="outline" onClick={() => setShowCommunityFoods(true)} className="rounded-2xl gap-2 shrink-0">
                  <GlobalBold size={16} color="currentColor" />
                  <span className="hidden sm:inline">Comunidade</span>
                </Button>
                <Button onClick={() => setShowCreateRecipe(true)} className="rounded-2xl gap-2 shrink-0">
                  <AddCircleBold size={16} color="currentColor" />
                  <span className="hidden sm:inline">Nova</span>
                </Button>
              </div>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setRecipeTab("all")}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${recipeTab === "all" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}
              >
                Todas
              </button>
              <button
                onClick={() => setRecipeTab("favorites")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${recipeTab === "favorites" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}
              >
                <BookmarkBold size={14} color="currentColor" />
                Salvas
              </button>

              <div className="h-6 w-px bg-muted-foreground/20 mx-1 self-center" />

              {/* Category filters */}
              {[
                { value: "all", label: "Todas categorias", icon: null },
                { value: "breakfast", label: "Café", icon: SunBold },
                { value: "lunch", label: "Almoço", icon: ChefHatBold },
                { value: "snack", label: "Lanche", icon: CupHotBold },
                { value: "dinner", label: "Janta", icon: MoonBold },
                { value: "general", label: "Geral", icon: ClipboardTextBold },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${categoryFilter === cat.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}
                >
                  {cat.icon && <cat.icon size={12} color="currentColor" />}
                  {cat.label}
                </button>
              ))}

              <div className="h-6 w-px bg-muted-foreground/20 mx-1 self-center" />

              {/* Cost filters */}
              {[
                { value: "all", label: "Todos", icon: WalletMoneyBold },
                { value: "1", label: "Barato", className: "text-green-500" },
                { value: "2", label: "Médio", className: "text-yellow-500" },
                { value: "3", label: "Caro", className: "text-red-500" },
              ].map((cost: any) => (
                <button
                  key={cost.value}
                  onClick={() => setCostFilter(cost.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${costFilter === cost.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}
                >
                  {cost.icon ? <cost.icon size={12} color="currentColor" /> : <TagBold size={12} color="currentColor" className={cost.className} />}
                  {cost.label}
                </button>
              ))}
            </div>

            {recipesLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <ChefHatHeartBold size={48} color="currentColor" className="text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma receita encontrada</p>
                <Button variant="outline" onClick={() => setShowCreateRecipe(true)} className="rounded-2xl gap-2">
                  <AddCircleBold size={16} color="currentColor" />
                  Criar primeira receita
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {filteredRecipes.map((recipe) => {
                  const costLevel = recipe.cost_level || 1;
                  return (
                    <div
                      key={recipe.id}
                      onClick={() => setSelectedRecipe(recipe)}
                      className="flex flex-col justify-between min-w-[170px] h-[210px] rounded-2xl bg-muted/50 shrink-0 group cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all hover-scale overflow-hidden"
                    >
                      {recipe.image_url ? (
                        <div className="h-24 w-full overflow-hidden">
                          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 pb-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                            <ChefHatHeartBold size={20} color="currentColor" className="text-primary" />
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map((l) => (
                              <div key={l} className={`h-1.5 w-1.5 rounded-full ${l <= costLevel ? COST_COLORS[costLevel].replace("text-", "bg-") : "bg-muted-foreground/20"}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="p-4 pt-2">
                        <p className="text-sm font-bold text-card-foreground leading-tight line-clamp-2">{recipe.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {recipe.calories ?? 0} kcal · {recipe.protein ?? 0}g prot
                        </p>
                        {(recipe.rating_count ?? 0) > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <StarBold size={12} color="currentColor" className="text-yellow-400" />
                            <span className="text-[10px] font-bold text-foreground">{(recipe.avg_rating ?? 0).toFixed(1)}</span>
                            <span className="text-[10px] text-muted-foreground">({recipe.rating_count})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-center min-w-[48px] shrink-0">
                  <AltArrowRightBold size={24} color="currentColor" className="text-muted-foreground" />
                </div>
              </div>
            )}
          </section>
        </motion.div>
      </motion.div>

      {/* Add food dialog */}
      <Dialog open={addDialog.open} onOpenChange={(open) => !open && setAddDialog({ open: false, mealTime: "" })}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar em {MEAL_TIMES.find((m) => m.key === addDialog.mealTime)?.label || ""}</DialogTitle>
          </DialogHeader>

          {!manualMode ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="relative">
                <MagniferBold size={18} color="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }} placeholder="Buscar alimento... (ex: arroz, frango)" className="pl-10" maxLength={100} />
                {dt.searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
              </div>

              {dt.searchResults.length > 0 && !selectedFood && (
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[240px] rounded-xl border border-border p-1">
                  {dt.searchResults.map((food) => (
                    <button key={food.id} onClick={() => handleSelectFood(food)} className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-card-foreground truncate">{food.name}</span>
                        {food.brand && <span className="text-xs text-muted-foreground truncate">{food.brand}</span>}
                        <span className="text-xs text-muted-foreground">{food.serving}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className="text-sm font-bold text-primary">{food.calories} kcal</span>
                        <span className="text-[10px] text-muted-foreground">P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedFood && (
                <div className="rounded-xl bg-sidebar-accent p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{selectedFood.name}</p>
                      {selectedFood.brand && <p className="text-xs text-muted-foreground">{selectedFood.brand}</p>}
                    </div>
                    <button onClick={() => setSelectedFood(null)} className="text-xs text-muted-foreground hover:text-foreground">Trocar</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { v: selectedFood.calories, l: "kcal", primary: true },
                      { v: `${selectedFood.protein}g`, l: "Prot" },
                      { v: `${selectedFood.carbs}g`, l: "Carb" },
                      { v: `${selectedFood.fat}g`, l: "Gord" },
                    ].map((x, i) => (
                      <div key={i} className="rounded-lg bg-background p-2">
                        <p className={`text-lg font-bold ${x.primary ? "text-primary" : "text-card-foreground"}`}>{x.v}</p>
                        <p className="text-[10px] text-muted-foreground">{x.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ex: 150g, 1 porção" maxLength={50} />
                  </div>
                </div>
              )}

              <button onClick={() => setManualMode(true)} className="text-xs text-muted-foreground hover:text-primary transition-colors self-center mt-1">
                Não encontrou? Adicionar manualmente
              </button>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>Alimento</Label><Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Ex: Arroz integral" maxLength={100} /></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input value={manualForm.quantity} onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })} placeholder="Ex: 150g, 1 xícara" maxLength={50} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Calorias (kcal)</Label><Input type="number" value={manualForm.calories || ""} onChange={(e) => setManualForm({ ...manualForm, calories: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Proteína (g)</Label><Input type="number" value={manualForm.protein || ""} onChange={(e) => setManualForm({ ...manualForm, protein: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Carboidrato (g)</Label><Input type="number" value={manualForm.carbs || ""} onChange={(e) => setManualForm({ ...manualForm, carbs: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Gordura (g)</Label><Input type="number" value={manualForm.fat || ""} onChange={(e) => setManualForm({ ...manualForm, fat: Number(e.target.value) })} /></div>
              </div>
              <button onClick={() => setManualMode(false)} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Voltar para busca</button>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddDialog({ open: false, mealTime: "" })}>Cancelar</Button>
            <Button onClick={handleSubmitFood} disabled={!manualMode && !selectedFood}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecipeDetailDialog
        recipe={selectedRecipe}
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
        isBookmarked={selectedRecipe ? isBookmarked(selectedRecipe.id) : false}
        onToggleBookmark={toggleBookmark}
        onEdit={(r) => setEditingRecipe(r)}
        onDelete={async (id) => {
          await deleteRecipe(id);
          setSelectedRecipe(null);
        }}
      />

      <CreateRecipeDialog
        open={showCreateRecipe}
        onOpenChange={setShowCreateRecipe}
        onSubmit={async (data) => {
          const result = await addRecipe(data);
          return result;
        }}
      />

      {editingRecipe && (
        <EditRecipeDialog
          recipe={editingRecipe}
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          onSubmit={async (id, data) => {
            const result = await updateRecipe(id, data);
            return result;
          }}
        />
      )}

      <CommunityFoodsDialog
        open={showCommunityFoods}
        onOpenChange={setShowCommunityFoods}
      />
    </>
  );
}
