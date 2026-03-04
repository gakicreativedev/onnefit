import { useState, useEffect, useRef } from "react";
import { ChefHatBold, AddCircleBold, AltArrowDownBold, AltArrowUpBold, TrashBinTrashBold, MagniferBold } from "solar-icon-set";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/modules/auth/hooks/useProfile";
import { calculateProteinTarget, calculateWaterTargetL } from "@/lib/nutrition";

interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealSlot {
  key: string;
  label: string;
  items: FoodItem[];
}

interface DailyNutritionCardProps {
  profile: Profile;
  mealSlots: MealSlot[];
  waterIntakeMl: number;
  onAddWater: (ml: number) => void;
  onAddFood: (mealTime: string, food: { name: string; quantity: string; calories: number; protein: number; carbs: number; fat: number }) => void;
  onDeleteFood: (foodId: string) => void;
}

interface FatSecretFood {
  id: string;
  name: string;
  brand: string | null;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
};

export function DailyNutritionCard({ profile, mealSlots, waterIntakeMl, onAddWater, onAddFood, onDeleteFood }: DailyNutritionCardProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState<{ open: boolean; mealTime: string }>({ open: false, mealTime: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FatSecretFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FatSecretFood | null>(null);
  const [quantity, setQuantity] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0 });

  const totalCalories = mealSlots.reduce((sum, slot) => sum + slot.items.reduce((s, i) => s + i.calories, 0), 0);
  const totalProtein = mealSlots.reduce((sum, slot) => sum + slot.items.reduce((s, i) => s + i.protein, 0), 0);

  const calorieTarget = profile.calorie_target || 2500;
  const caloriePercent = Math.min(100, Math.round((totalCalories / calorieTarget) * 100));

  const weightKg = profile.weight_kg || 70;
  const proteinTarget = calculateProteinTarget(weightKg, profile.goal || "maintain");
  const proteinPercent = proteinTarget > 0 ? Math.min(100, Math.round((totalProtein / proteinTarget) * 100)) : 0;

  const waterTargetL = calculateWaterTargetL(weightKg, profile.activity_level || "moderate");
  const waterLiters = waterIntakeMl / 1000;
  const waterPercent = Math.min(100, Math.round((waterLiters / waterTargetL) * 100));

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-foods", {
          body: { query: searchQuery.trim() },
        });
        if (error) throw error;
        setSearchResults(data?.foods || []);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  const openAddDialog = (mealTime: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setQuantity("");
    setManualMode(false);
    setManualForm({ name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
    setAddDialog({ open: true, mealTime });
  };

  const handleSelectFood = (food: FatSecretFood) => {
    setSelectedFood(food);
    setQuantity(food.serving || "1 porção");
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmitFood = () => {
    if (manualMode) {
      if (!manualForm.name.trim()) { toast.error("Informe o nome do alimento"); return; }
      onAddFood(addDialog.mealTime, manualForm);
    } else if (selectedFood) {
      onAddFood(addDialog.mealTime, {
        name: selectedFood.name + (selectedFood.brand ? ` (${selectedFood.brand})` : ""),
        quantity: quantity || selectedFood.serving,
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
      });
    } else {
      toast.error("Selecione um alimento");
      return;
    }
    setAddDialog({ open: false, mealTime: "" });
    toast.success("Alimento adicionado!");
  };

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[20px] sm:rounded-[28px] bg-card p-4 sm:p-6 h-full">
        <header className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/15">
              <ChefHatBold size={18} color="hsl(var(--primary))" />
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase text-card-foreground tracking-tight" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>
              DIETA
            </h2>
          </div>
        </header>

        {/* Compact macros row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Calorias", current: totalCalories, target: calorieTarget, unit: "", percent: caloriePercent },
            { label: "Proteína", current: totalProtein, target: proteinTarget, unit: "g", percent: proteinPercent },
            { label: "Água", current: waterLiters.toFixed(1), target: waterTargetL, unit: "L", percent: waterPercent },
          ].map((m) => (
            <div key={m.label} className="flex flex-col gap-1.5 rounded-2xl bg-background p-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</span>
              <p className="text-sm font-bold">
                <span className="text-primary">{m.current}</span>
                <span className="text-card-foreground">/{m.target}{m.unit}</span>
              </p>
              <div className="h-1 w-full rounded-full bg-card">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.percent}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Water buttons */}
        <div className="flex items-center gap-2">
          {[250, 500].map((ml) => (
            <button key={ml} onClick={() => onAddWater(ml)} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-background px-3 py-2 hover:bg-sidebar-accent transition-colors">
              <span className="text-sm">💧</span>
              <span className="text-xs font-bold text-card-foreground">+{ml}ml</span>
            </button>
          ))}
        </div>

        {/* Meal slots */}
        <div className="flex flex-col gap-1.5">
          {mealSlots.map((slot) => {
            const slotCalories = slot.items.reduce((s, i) => s + i.calories, 0);
            const isExpanded = expandedMeal === slot.key;
            return (
              <article key={slot.key} className="rounded-xl bg-background overflow-hidden">
                <button onClick={() => setExpandedMeal(isExpanded ? null : slot.key)} className="flex items-center justify-between w-full px-3 py-3 hover:bg-sidebar-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-card-foreground">{slot.label}</h3>
                    <span className="text-[10px] text-muted-foreground">{slot.items.length} {slot.items.length === 1 ? "item" : "itens"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-primary">{slotCalories} kcal</span>
                    {isExpanded ? <AltArrowUpBold size={12} color="currentColor" /> : <AltArrowDownBold size={12} color="currentColor" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {slot.items.length === 0 && <p className="text-xs text-muted-foreground py-1.5">Nenhum alimento registrado</p>}
                    {slot.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-card px-2.5 py-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-card-foreground truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-primary">{item.calories} kcal</span>
                            <span className="text-[9px] text-muted-foreground">P:{item.protein}g · C:{item.carbs}g · G:{item.fat}g</span>
                          </div>
                          <button onClick={() => onDeleteFood(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                            <TrashBinTrashBold size={12} color="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openAddDialog(slot.key)} className="flex items-center gap-1.5 w-full rounded-lg border border-dashed border-muted-foreground/30 px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <AddCircleBold size={12} color="currentColor" />
                      <span>Adicionar alimento</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Add food dialog */}
      <Dialog open={addDialog.open} onOpenChange={(open) => !open && setAddDialog({ open: false, mealTime: "" })}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar em {MEAL_LABELS[addDialog.mealTime] || ""}</DialogTitle>
          </DialogHeader>

          {!manualMode ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="relative">
                <MagniferBold size={18} color="currentColor" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <Input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedFood(null); }}
                  placeholder="Buscar alimento... (ex: arroz, frango)"
                  className="pl-10"
                  maxLength={100}
                />
                {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              </div>

              {searchResults.length > 0 && !selectedFood && (
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[240px] rounded-xl border border-border p-1">
                  {searchResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors"
                    >
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
                    ].map((x) => (
                      <div key={x.l} className="rounded-lg bg-background p-2">
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
              <div className="space-y-1">
                <Label>Alimento</Label>
                <Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="Ex: Arroz integral" maxLength={100} />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input value={manualForm.quantity} onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })} placeholder="Ex: 150g, 1 xícara" maxLength={50} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Calorias (kcal)</Label>
                  <Input type="number" value={manualForm.calories || ""} onChange={(e) => setManualForm({ ...manualForm, calories: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Proteína (g)</Label>
                  <Input type="number" value={manualForm.protein || ""} onChange={(e) => setManualForm({ ...manualForm, protein: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Carboidrato (g)</Label>
                  <Input type="number" value={manualForm.carbs || ""} onChange={(e) => setManualForm({ ...manualForm, carbs: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Gordura (g)</Label>
                  <Input type="number" value={manualForm.fat || ""} onChange={(e) => setManualForm({ ...manualForm, fat: Number(e.target.value) })} />
                </div>
              </div>
              <button onClick={() => setManualMode(false)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                ← Voltar para busca
              </button>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddDialog({ open: false, mealTime: "" })}>Cancelar</Button>
            <Button onClick={handleSubmitFood} disabled={!manualMode && !selectedFood}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
