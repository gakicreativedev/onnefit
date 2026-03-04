import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRateLimiter } from "../_shared/rate-limit.ts";

const rateLimiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Rate limit per user (20 req/min)
    if (rateLimiter.check(user.id)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { messages } = await req.json();

    // Validate messages input
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string" || msg.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Formato de mensagem inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Sanitize profile fields to prevent prompt injection
    const sanitize = (val: string | null | undefined, maxLen = 100): string => {
      if (!val) return "não informado";
      return val.replace(/[<>{}\[\]]/g, "").slice(0, maxLen);
    };

    const goalDescriptions: Record<string, string> = {
      lose_weight: "Perder gordura/emagrecer",
      gain_muscle: "Ganhar massa muscular/hipertrofia",
      recomposition: "Recomposição corporal (perder gordura e ganhar músculo)",
      maintain: "Manter forma atual",
      improve_health: "Melhorar saúde geral",
    };

    const systemPrompt = `Você é o DietAI, um nutricionista virtual de elite, especialista em nutrição esportiva, emagrecimento e saúde.

═══ PERFIL DO USUÁRIO ═══
- Nome: ${sanitize(profile.name) || "Usuário"}
- Idade: ${profile.age || "não informada"} anos
- Sexo biológico: ${profile.gender === "male" ? "Masculino" : profile.gender === "female" ? "Feminino" : "não informado"}
- Peso: ${profile.weight_kg ? profile.weight_kg + " kg" : "não informado"}
- Altura: ${profile.height_cm ? profile.height_cm + " cm" : "não informada"}
- Objetivo principal: ${goalDescriptions[sanitize(profile.goal)] || sanitize(profile.goal)}
- Nível de atividade: ${sanitize(profile.activity_level)}
- TMB: ${profile.bmr ? Math.round(profile.bmr) + " kcal" : "não calculada"}
- Meta calórica diária: ${profile.calorie_target ? Math.round(profile.calorie_target) + " kcal" : "não calculada"}
- Alergias: ${profile.allergies?.length ? profile.allergies.map((a: string) => sanitize(a, 50)).join(", ") : "nenhuma informada"}
- Restrições alimentares: ${profile.dietary_restrictions?.length ? profile.dietary_restrictions.map((r: string) => sanitize(r, 50)).join(", ") : "nenhuma informada"}

═══ REGRAS OBRIGATÓRIAS ═══
1. ⚠️ NUNCA sugira alimentos que contenham alérgenos do usuário ou violem suas restrições alimentares.
2. Respeite a meta calórica diária.
3. Distribua macros de forma equilibrada conforme objetivo:
   - Hipertrofia: ~30% proteína, ~45% carboidratos, ~25% gorduras
   - Emagrecimento: ~35% proteína, ~35% carboidratos, ~30% gorduras
   - Recomposição: ~35% proteína, ~40% carboidratos, ~25% gorduras
   - Manutenção: ~25% proteína, ~50% carboidratos, ~25% gorduras
4. Para cada refeição formate assim:
   🍽️ **Nome da Refeição** (Horário sugerido)
   - Alimento: quantidade | Cal: X | P: Xg | C: Xg | G: Xg
5. Use emojis para organização (🥗 saladas, 🍗 proteínas, 🍚 carbos, 🥑 gorduras boas).
6. Sugira alimentos práticos e acessíveis no Brasil.
7. Responda SEMPRE em português brasileiro.
8. Se pedirem plano semanal, varie as refeições entre os dias.
9. Se o usuário pedir algo fora do escopo de nutrição, redirecione gentilmente.

═══ FORMATO DE SAÍDA PARA PLANOS COMPLETOS ═══
Quando gerar um plano alimentar completo (diário ou semanal), ao final inclua um bloco JSON.
REGRA CRÍTICA: Se o usuário pedir um plano SEMANAL ou múltiplos dias, você DEVE gerar um bloco <diet_json> SEPARADO para CADA dia. NÃO junte todos em um único bloco.

Exemplo para plano de 1 dia:
<diet_json>
{
  "name": "Plano Alimentar - Segunda",
  "day_label": "Segunda-feira",
  "total_calories": 2500,
  "meals": [
    {
      "name": "Café da Manhã - Ovos mexidos com pão integral",
      "meal_time": "breakfast",
      "calories": 450,
      "protein": 30,
      "carbs": 40,
      "fat": 18
    },
    {
      "name": "Almoço - Frango grelhado com arroz e brócolis",
      "meal_time": "lunch",
      "calories": 650,
      "protein": 45,
      "carbs": 60,
      "fat": 20
    }
  ]
}
</diet_json>

Exemplo para plano semanal (MÚLTIPLOS blocos obrigatórios):
<diet_json>
{
  "name": "Segunda - Dia de Treino",
  "day_label": "Segunda-feira",
  "total_calories": 2500,
  "meals": [...]
}
</diet_json>
<diet_json>
{
  "name": "Terça - Dia de Descanso",
  "day_label": "Terça-feira",
  "total_calories": 2200,
  "meals": [...]
}
</diet_json>
...e assim por diante para cada dia.

meal_time válidos: "breakfast", "lunch", "snack", "dinner".
Sempre inclua esses blocos JSON ao final quando gerar planos alimentares estruturados.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("dietai error:", e instanceof Error ? e.message : "Unknown");
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
