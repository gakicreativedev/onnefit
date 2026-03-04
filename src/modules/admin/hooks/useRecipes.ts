import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string | null;
  category: string;
  created_by: string;
  created_at: string;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });
    setRecipes((data as Recipe[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const addRecipe = async (recipe: Omit<Recipe, "id" | "created_at" | "created_by">, userId: string) => {
    const { error } = await supabase.from("recipes").insert({ ...recipe, created_by: userId, is_shared: true });
    if (!error) await fetchRecipes();
    return { error };
  };

  const updateRecipe = async (id: string, recipe: Partial<Omit<Recipe, "id" | "created_at" | "created_by">>) => {
    const { error } = await supabase.from("recipes").update(recipe).eq("id", id);
    if (!error) await fetchRecipes();
    return { error };
  };

  const deleteRecipe = async (id: string) => {
    await supabase.from("recipes").delete().eq("id", id);
    await fetchRecipes();
  };

  return { recipes, loading, addRecipe, updateRecipe, deleteRecipe, refetch: fetchRecipes };
}
