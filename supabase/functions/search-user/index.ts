import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    // Validate caller
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub as string;

    // Parse request
    const { username } = await req.json();
    if (!username || typeof username !== "string" || username.length > 100) {
      return new Response(JSON.stringify({ error: "Username inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean @ prefix and normalize
    const cleaned = username.trim().replace(/^@/, "").toLowerCase().replace(/\s+/g, ".");

    if (!cleaned) {
      return new Response(JSON.stringify({ error: "Username inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Server-side role check: only professionals can add students
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();

    if (!roleData || roleData.role !== "professional") {
      return new Response(JSON.stringify({ error: "Apenas profissionais podem adicionar alunos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search by name in profiles (username = name lowercased with dots)
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, name, avatar_url")
      .not("name", "is", null);

    const foundProfile = (profiles || []).find((p) => {
      const handle = p.name?.toLowerCase().replace(/\s+/g, ".") || "";
      return handle === cleaned;
    });

    if (!foundProfile) {
      return new Response(
        JSON.stringify({ error: "Usuário @" + cleaned + " não encontrado", found: false }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const foundUserId = foundProfile.user_id;

    if (foundUserId === callerId) {
      return new Response(
        JSON.stringify({ error: "Você não pode adicionar a si mesmo" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already linked
    const { data: existing } = await adminClient
      .from("trainer_students")
      .select("id, status")
      .eq("trainer_id", callerId)
      .eq("student_id", foundUserId)
      .maybeSingle();

    

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Este aluno já está vinculado",
          status: existing.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert trainer_students record
    const { error: insertErr } = await adminClient
      .from("trainer_students")
      .insert({
        trainer_id: callerId,
        student_id: foundUserId,
        status: "pending",
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        student: {
          id: foundUserId,
          name: foundProfile.name || null,
          avatar_url: foundProfile.avatar_url || null,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
