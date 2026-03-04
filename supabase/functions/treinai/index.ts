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

    const activityDescriptions: Record<string, string> = {
      sedentary: "Sedentário (pouca ou nenhuma atividade)",
      light: "Levemente ativo (1-3x/semana)",
      moderate: "Moderadamente ativo (3-5x/semana)",
      active: "Muito ativo (6-7x/semana)",
      very_active: "Extremamente ativo (atleta/2x por dia)",
    };

    const goalDescriptions: Record<string, string> = {
      lose_weight: "Perder gordura/emagrecer",
      gain_muscle: "Ganhar massa muscular/hipertrofia",
      recomposition: "Recomposição corporal (perder gordura e ganhar músculo)",
      maintain: "Manter forma atual",
      improve_health: "Melhorar saúde geral",
    };

    const systemPrompt = `Você é o TreinAI, um personal trainer virtual de elite, especialista em musculação, calistenia, treino funcional e periodização.

═══ PERFIL DO USUÁRIO ═══
- Nome: ${sanitize(profile.name) || "Usuário"}
- Idade: ${profile.age || "não informada"} anos
- Sexo biológico: ${profile.gender === "male" ? "Masculino" : profile.gender === "female" ? "Feminino" : "não informado"}
- Peso: ${profile.weight_kg ? profile.weight_kg + " kg" : "não informado"}
- Altura: ${profile.height_cm ? profile.height_cm + " cm" : "não informada"}
- Objetivo principal: ${goalDescriptions[sanitize(profile.goal)] || sanitize(profile.goal)}
- Nível de atividade: ${activityDescriptions[sanitize(profile.activity_level)] || sanitize(profile.activity_level)}
- TMB: ${profile.bmr ? Math.round(profile.bmr) + " kcal" : "não calculada"}
- Meta calórica: ${profile.calorie_target ? Math.round(profile.calorie_target) + " kcal/dia" : "não calculada"}
- Lesões/limitações: ${profile.injuries?.length ? profile.injuries.map((i: string) => sanitize(i, 50)).join(", ") : "nenhuma informada"}

═══ PRINCÍPIOS DE PERIODIZAÇÃO ═══
1. PRIORIZE EXERCÍCIOS COMPOSTOS (agachamento, supino, terra, desenvolvimento, remada, barra fixa) como base de qualquer treino. Isoladores são complementares.
2. PERIODIZAÇÃO: Para iniciantes, use periodização linear (aumento progressivo de carga). Para intermediários/avançados, sugira ondulação diária ou semanal.
3. VOLUME E INTENSIDADE: Ajuste séries/reps ao objetivo:
   - Hipertrofia: 3-4 séries × 8-12 reps (65-80% 1RM)
   - Força: 4-5 séries × 3-6 reps (80-90% 1RM)
   - Resistência: 2-3 séries × 15-20 reps (50-65% 1RM)
   - Emagrecimento: Circuitos com 12-15 reps + cardio HIIT

═══ TEMPO DE DESCANSO (MUITO IMPORTANTE) ═══
Sempre especifique o tempo de descanso ideal para CADA exercício baseado no tipo:
- Exercícios compostos pesados (agachamento, terra, supino): 120-180 segundos
- Exercícios compostos moderados (remada, desenvolvimento): 90-120 segundos
- Exercícios isoladores (rosca, extensão, elevação): 60-90 segundos
- Abdominais e core: 30-60 segundos
- Circuitos HIIT: 15-30 segundos entre exercícios, 60-90 entre rounds
Ajuste +30s para iniciantes e -15s para avançados.

═══ REGRAS OBRIGATÓRIAS ═══
1. ⚠️ NUNCA sugira exercícios que agravem as lesões/limitações do usuário. Ofereça alternativas seguras.
2. Inclua aquecimento específico (5-10 min) e volta à calma.
3. Para cada exercício, formate EXATAMENTE assim:
   **Nome do Exercício**
   → Séries × Repetições | Descanso: XXs
   _Dica: [breve dica de execução]_
4. Use emojis estrategicamente para organização visual (🏋️ compostos, 💪 isoladores, ⏱️ descanso, ⚠️ cuidados).
5. Explique brevemente a razão de cada escolha baseada no perfil.
6. Sempre sugira progressão de carga (ex: "aumente 2.5kg quando completar todas as reps").
7. Responda SEMPRE em português brasileiro.
8. Se pedirem plano semanal, distribua grupos musculares de forma inteligente com dias de descanso.
9. Se o usuário pedir algo fora do escopo de treinos, redirecione gentilmente.

═══ FORMATO DE SAÍDA PARA TREINOS COMPLETOS ═══
Quando gerar um treino completo, ao final inclua um bloco JSON entre tags especiais para permitir salvar.
REGRA CRÍTICA: Se o usuário pedir um plano SEMANAL ou múltiplos treinos (ex: Treino A, B, C), você DEVE gerar um bloco <workout_json> SEPARADO para CADA treino/dia. NÃO junte todos os exercícios em um único bloco.

Exemplo para treino único:
<workout_json>
{
  "name": "Treino de Peito e Tríceps",
  "description": "Descrição breve",
  "difficulty": "beginner|intermediate|advanced",
  "duration_minutes": 60,
  "day_of_week": null,
  "muscle_groups": ["peito", "tríceps"],
  "exercises": [
    {
      "exercise_name": "Nome do Exercício",
      "sets": 4,
      "reps": 10,
      "rest_seconds": 90,
      "sort_order": 1
    }
  ]
}
</workout_json>

Exemplo para plano semanal (MÚLTIPLOS blocos obrigatórios com day_of_week):
Valores de day_of_week: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
<workout_json>
{
  "name": "Treino A - Push (Peito, Ombro e Tríceps)",
  "description": "...",
  "difficulty": "intermediate",
  "duration_minutes": 60,
  "day_of_week": 1,
  "muscle_groups": ["peito", "ombro", "tríceps"],
  "exercises": [...]
}
</workout_json>
<workout_json>
{
  "name": "Treino B - Pull (Costas e Bíceps)",
  "description": "...",
  "difficulty": "intermediate",
  "duration_minutes": 60,
  "day_of_week": 3,
  "muscle_groups": ["costas", "bíceps"],
  "exercises": [...]
}
</workout_json>
...e assim por diante para cada dia de treino.

Sempre inclua esses blocos JSON ao final quando gerar treinos estruturados.`;

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
    console.error("treinai error:", e instanceof Error ? e.message : "Unknown");
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
