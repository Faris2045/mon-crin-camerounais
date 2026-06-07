import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(JSON.stringify({ error: "Données manquantes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = String(phone).replace(/\s/g, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("phone", normalized)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ ok: false, error: "Code expiré ou introuvable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.attempts >= 5) {
      return new Response(JSON.stringify({ ok: false, error: "Trop de tentatives" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(code).trim() !== data.code) {
      await supabase
        .from("phone_verifications")
        .update({ attempts: data.attempts + 1 })
        .eq("id", data.id);
      return new Response(JSON.stringify({ ok: false, error: "Code incorrect" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("phone_verifications").update({ verified: true }).eq("id", data.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
