import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/auth/hooks/useAuth";

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  image_url: string | null;
  category: string | null;
  cost_level: number | null;
  created_by: string;
  created_at: string;
  is_shared: boolean;
  avg_rating?: number;
  rating_count?: number;
}

// ... keep existing code (RecipeComment and RecipeRating interfaces)
export interface RecipeComment {
  id: string;
  recipe_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

export interface RecipeRating {
  id: string;
  recipe_id: string;
  user_id: string;
  rating: number;
}

export function useRecipes() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const { data: ratings } = await supabase
        .from("recipe_ratings")
        .select("recipe_id, rating");

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (ratings || []).forEach((r: any) => {
        if (!ratingMap[r.recipe_id]) ratingMap[r.recipe_id] = { sum: 0, count: 0 };
        ratingMap[r.recipe_id].sum += r.rating;
        ratingMap[r.recipe_id].count += 1;
      });

      setRecipes(
        data.map((r: any) => ({
          ...r,
          avg_rating: ratingMap[r.id] ? ratingMap[r.id].sum / ratingMap[r.id].count : 0,
          rating_count: ratingMap[r.id]?.count || 0,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const addRecipe = async (recipe: {
    title: string;
    description?: string | null;
    ingredients: string[];
    instructions?: string | null;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    category?: string;
    cost_level?: number;
    image_url?: string | null;
    servings?: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };
    const { error } = await supabase.from("recipes").insert({
      ...recipe,
      created_by: user.id,
      is_shared: true,
    });
    if (!error) await fetchRecipes();
    return { error };
  };

  const updateRecipe = async (id: string, recipe: {
    title: string;
    description?: string | null;
    ingredients: string[];
    instructions?: string | null;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    category?: string;
    cost_level?: number;
    image_url?: string | null;
    servings?: number;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };
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

// ... keep existing code (useRecipeComments)
export function useRecipeComments(recipeId: string | null) {
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!recipeId) { setComments([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("recipe_comments")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("public_profiles")
        .select("user_id, name, avatar_url, username")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      setComments(
        data.map((c: any) => ({
          ...c,
          author_name: profileMap[c.user_id]?.name || profileMap[c.user_id]?.username || "Usuário",
          author_avatar: profileMap[c.user_id]?.avatar_url,
        }))
      );
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [recipeId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = async (content: string, userId: string) => {
    if (!recipeId) return;
    await supabase.from("recipe_comments").insert({ recipe_id: recipeId, user_id: userId, content });
    await fetchComments();
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("recipe_comments").delete().eq("id", commentId);
    await fetchComments();
  };

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}

// ... keep existing code (useRecipeRating)
export function useRecipeRating(recipeId: string | null) {
  const { user } = useAuth();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!recipeId) return;
    const { data: all } = await supabase
      .from("recipe_ratings")
      .select("*")
      .eq("recipe_id", recipeId);

    if (all && all.length > 0) {
      const sum = all.reduce((s: number, r: any) => s + r.rating, 0);
      setAvg(sum / all.length);
      setCount(all.length);
      if (user) {
        const mine = all.find((r: any) => r.user_id === user.id);
        setMyRating(mine ? mine.rating : null);
      }
    } else {
      setAvg(0);
      setCount(0);
      setMyRating(null);
    }
  }, [recipeId, user]);

  useEffect(() => { fetch(); }, [fetch]);

  const rate = async (rating: number) => {
    if (!recipeId || !user) return;
    if (myRating !== null) {
      await supabase.from("recipe_ratings").update({ rating }).eq("recipe_id", recipeId).eq("user_id", user.id);
    } else {
      await supabase.from("recipe_ratings").insert({ recipe_id: recipeId, user_id: user.id, rating });
    }
    setMyRating(rating);
    await fetch();
  };

  return { myRating, avg, count, rate };
}

export function useRecipeBookmarks() {
  const { user } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!user) { setBookmarkedIds(new Set()); setLoading(false); return; }
    const { data } = await supabase
      .from("recipe_bookmarks")
      .select("recipe_id")
      .eq("user_id", user.id);
    setBookmarkedIds(new Set((data || []).map((b: any) => b.recipe_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const toggle = async (recipeId: string) => {
    if (!user) return;
    if (bookmarkedIds.has(recipeId)) {
      await supabase.from("recipe_bookmarks").delete().eq("recipe_id", recipeId).eq("user_id", user.id);
      setBookmarkedIds((prev) => { const n = new Set(prev); n.delete(recipeId); return n; });
    } else {
      await supabase.from("recipe_bookmarks").insert({ recipe_id: recipeId, user_id: user.id });
      setBookmarkedIds((prev) => new Set(prev).add(recipeId));
    }
  };

  const isBookmarked = (recipeId: string) => bookmarkedIds.has(recipeId);

  return { bookmarkedIds, isBookmarked, toggle, loading, refetch: fetchBookmarks };
}
