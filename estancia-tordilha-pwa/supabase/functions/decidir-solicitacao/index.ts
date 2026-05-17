import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DecidirInput {
  solicitacao_id: string;
  decisao: "aprovar" | "rejeitar";
  motivo?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body: DecidirInput = await req.json();

    if (!body.solicitacao_id || !["aprovar", "rejeitar"].includes(body.decisao)) {
      return new Response(JSON.stringify({ error: "INVALID_INPUT" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("rpc_decidir_solicitacao", {
      p_solicitacao_id: body.solicitacao_id,
      p_decisao: body.decisao,
      p_motivo: body.motivo ?? null,
    });

    if (error) {
      const code = error.message?.includes("FORBIDDEN") ? 403
        : error.message?.includes("NOT_FOUND") ? 404
        : error.message?.includes("ALREADY_DECIDED") ? 409
        : error.message?.includes("STALE_REQUEST") ? 410
        : 400;
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
