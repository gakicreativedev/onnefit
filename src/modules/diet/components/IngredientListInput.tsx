import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AddCircleBold, CloseCircleBold, PenBold } from "solar-icon-set";

export const UNITS = ["g", "ml", "un", "xíc", "col.sopa", "col.chá", "fatia", "kg", "L"] as const;
export type IngredientUnit = (typeof UNITS)[number];

export interface IngredientItem {
  name: string;
  weight_g: number;
  unit: IngredientUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FoodResult {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Stores the per-100g base values for recalculating on weight change */
interface BaseMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  items: IngredientItem[];
  onChange: (items: IngredientItem[]) => void;
}

export default function IngredientListInput({ items, onChange }: Props) {
  const [searchStates, setSearchStates] = useState<Record<number, { query: string; results: FoodResult[]; loading: boolean; open: boolean }>>({});
  const [editingMacros, setEditingMacros] = useState<Record<number, boolean>>({});
  const [baseMacros, setBaseMacros] = useState<Record<number, BaseMacros>>({});
  const debounceRefs = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const searchFood = useCallback(async (query: string, index: number) => {
    if (query.length < 2) {
      setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], results: [], loading: false, open: false } }));
      return;
    }
    setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], loading: true, open: true } }));
    try {
      const { data, error } = await supabase.functions.invoke("search-foods", { body: { query } });
      if (!error && data?.foods) {
        setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], results: data.foods, loading: false, open: true } }));
      } else {
        setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], results: [], loading: false } }));
      }
    } catch {
      setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], results: [], loading: false } }));
    }
  }, []);

  const handleNameChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name: value, calories: 0, protein: 0, carbs: 0, fat: 0 };
    onChange(updated);

    setSearchStates(prev => ({ ...prev, [index]: { query: value, results: prev[index]?.results || [], loading: false, open: false } }));

    if (debounceRefs.current[index]) clearTimeout(debounceRefs.current[index]);
    debounceRefs.current[index] = setTimeout(() => searchFood(value, index), 400);
  };

  const selectFood = (index: number, food: FoodResult) => {
    const weight = items[index].weight_g || 100;
    const factor = weight / 100;
    // Store the per-100g base values for future recalculation
    setBaseMacros(prev => ({
      ...prev,
      [index]: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
    }));
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      name: food.name,
      weight_g: weight,
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor),
      carbs: Math.round(food.carbs * factor),
      fat: Math.round(food.fat * factor),
    };
    onChange(updated);
    setSearchStates(prev => ({ ...prev, [index]: { ...prev[index], open: false, query: food.name } }));
    setEditingMacros(prev => ({ ...prev, [index]: false }));
  };

  const handleWeightChange = (index: number, weight: number) => {
    const updated = [...items];
    const item = updated[index];
    const base = baseMacros[index];
    if (base && weight > 0) {
      const factor = weight / 100;
      updated[index] = {
        ...item,
        weight_g: weight,
        calories: Math.round(base.calories * factor),
        protein: Math.round(base.protein * factor),
        carbs: Math.round(base.carbs * factor),
        fat: Math.round(base.fat * factor),
      };
    } else {
      updated[index] = { ...item, weight_g: weight };
    }
    onChange(updated);
  };

  const handleUnitChange = (index: number, unit: IngredientUnit) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unit };
    onChange(updated);
  };

  const handleMacroChange = (index: number, field: "calories" | "protein" | "carbs" | "fat", value: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addItem = () => {
    onChange([...items, { name: "", weight_g: 100, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const handler = () => setSearchStates(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[Number(k)] = { ...next[Number(k)], open: false }; });
      return next;
    });
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="space-y-2">
      <Label>Ingredientes</Label>
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1" onClick={e => e.stopPropagation()}>
              <Input
                value={item.name}
                onChange={e => handleNameChange(i, e.target.value)}
                placeholder="Buscar ingrediente..."
                className="rounded-xl bg-muted/50 border-0 text-sm"
              />
              {searchStates[i]?.open && (searchStates[i]?.loading || searchStates[i]?.results?.length > 0) && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {searchStates[i]?.loading ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">Buscando...</div>
                  ) : (
                    searchStates[i]?.results.map(food => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectFood(i, food)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                      >
                        <div className="font-medium truncate">{food.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {food.calories} kcal · {food.protein}P · {food.carbs}C · {food.fat}G /100g
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="w-16">
              <Input
                type="number"
                value={item.weight_g || ""}
                onChange={e => handleWeightChange(i, Number(e.target.value))}
                placeholder="Qtd"
                className="rounded-xl bg-muted/50 border-0 text-sm text-center"
                min={0}
              />
            </div>
            <div className="w-20">
              <Select value={item.unit || "g"} onValueChange={(v) => handleUnitChange(i, v as IngredientUnit)}>
                <SelectTrigger className="rounded-xl bg-muted/50 border-0 text-sm h-10 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0" disabled={items.length <= 1}>
              <CloseCircleBold size={18} color="currentColor" />
            </button>
          </div>
          {/* Macro row: show values or toggle edit */}
          <div className="flex items-center gap-1 pl-1">
            {item.calories > 0 && !editingMacros[i] ? (
              <div className="flex-1 text-[10px] text-muted-foreground">
                {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g G
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setEditingMacros(prev => ({ ...prev, [i]: !prev[i] }))}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-0.5"
              title="Editar macros manualmente"
            >
              <PenBold size={12} color="currentColor" />
            </button>
          </div>
          {editingMacros[i] && (
            <div className="grid grid-cols-4 gap-1.5 pl-1">
              <div>
                <Input
                  type="number"
                  value={item.calories || ""}
                  onChange={e => handleMacroChange(i, "calories", Number(e.target.value))}
                  placeholder="kcal"
                  className="rounded-lg bg-muted/50 border-0 text-[11px] text-center h-8"
                  min={0}
                />
                <div className="text-[9px] text-muted-foreground text-center mt-0.5">kcal</div>
              </div>
              <div>
                <Input
                  type="number"
                  value={item.protein || ""}
                  onChange={e => handleMacroChange(i, "protein", Number(e.target.value))}
                  placeholder="P"
                  className="rounded-lg bg-muted/50 border-0 text-[11px] text-center h-8"
                  min={0}
                />
                <div className="text-[9px] text-muted-foreground text-center mt-0.5">Prot</div>
              </div>
              <div>
                <Input
                  type="number"
                  value={item.carbs || ""}
                  onChange={e => handleMacroChange(i, "carbs", Number(e.target.value))}
                  placeholder="C"
                  className="rounded-lg bg-muted/50 border-0 text-[11px] text-center h-8"
                  min={0}
                />
                <div className="text-[9px] text-muted-foreground text-center mt-0.5">Carbo</div>
              </div>
              <div>
                <Input
                  type="number"
                  value={item.fat || ""}
                  onChange={e => handleMacroChange(i, "fat", Number(e.target.value))}
                  placeholder="G"
                  className="rounded-lg bg-muted/50 border-0 text-[11px] text-center h-8"
                  min={0}
                />
                <div className="text-[9px] text-muted-foreground text-center mt-0.5">Gord</div>
              </div>
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={addItem} className="w-full text-primary gap-1">
        <AddCircleBold size={16} color="currentColor" />
        Adicionar ingrediente
      </Button>
    </div>
  );
}
