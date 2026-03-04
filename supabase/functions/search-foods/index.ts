import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ foods: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTerm = query.trim().slice(0, 200);

    // Sanitize search term to prevent SQL injection via .or() string interpolation
    const sanitized = searchTerm.replace(/[%_'";\\\x00-\x1f]/g, "");
    if (!sanitized) {
      return new Response(JSON.stringify({ foods: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Search TACO table first (local, fast, Brazilian foods)
    const { data: tacoResults, error: tacoError } = await supabase
      .from("taco_foods")
      .select("*")
      .or(`name.ilike.%${sanitized}%,category.ilike.%${sanitized}%`)
      .limit(10);

    const tacoFoods = (tacoResults || []).map((item: any) => ({
      id: `taco-${item.id}`,
      name: item.name,
      brand: "TACO",
      serving: item.serving_size || "100g",
      calories: Math.round(item.calories_kcal),
      protein: Math.round(item.protein_g),
      carbs: Math.round(item.carbs_g),
      fat: Math.round(item.fat_g),
      source: "taco",
    }));

    if (tacoError) {
      console.error("TACO search error:", tacoError.message);
    }

    // 2. If TACO returned fewer than 5 results, supplement with Open Food Facts
    let offFoods: any[] = [];
    if (tacoFoods.length < 5) {
      try {
        const searchParams = new URLSearchParams({
          search_terms: searchTerm,
          search_simple: "1",
          action: "process",
          json: "1",
          page_size: String(10 - tacoFoods.length),
          fields: "product_name,brands,nutriments,serving_size",
        });

        const apiRes = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?${searchParams.toString()}`,
          { headers: { "User-Agent": "FitSoul/1.0 (fitness app)" } }
        );

        if (apiRes.ok) {
          const result = await apiRes.json();
          const products = result?.products || [];
          offFoods = products
            .filter((p: any) => p.product_name)
            .map((p: any, index: number) => {
              const n = p.nutriments || {};
              return {
                id: p.code || `off-${index}`,
                name: p.product_name,
                brand: p.brands || null,
                serving: p.serving_size || "100g",
                calories: Math.round(n["energy-kcal_100g"] || n["energy-kcal"] || 0),
                protein: Math.round(n.proteins_100g || n.proteins || 0),
                carbs: Math.round(n.carbohydrates_100g || n.carbohydrates || 0),
                fat: Math.round(n.fat_100g || n.fat || 0),
                source: "openfoodfacts",
              };
            });
        }
      } catch (e) {
        console.error("OpenFoodFacts fallback error:", e);
      }
    }

    // TACO results come first, then OFF results
    const foods = [...tacoFoods, ...offFoods];

    return new Response(JSON.stringify({ foods }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Food search error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "Erro na busca de alimentos" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
