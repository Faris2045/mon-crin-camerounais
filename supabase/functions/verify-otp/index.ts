import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, code, fullName, fingerprint } = await req.json();
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

    // 1) Validate the OTP
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

    // 2) Anti-duplicate / anti-fraud check (service role bypasses RLS)
    const { data: existing } = await supabase
      .from("identity_traces")
      .select("id, phone, fingerprint")
      .or(
        `phone.eq.${normalized}${fingerprint ? `,fingerprint.eq.${fingerprint}` : ""}`,
      )
      .limit(5);

    if (existing && existing.length > 0) {
      const samePhone = existing.find((e: { phone: string }) => e.phone === normalized);
      const sameDevice = existing.find(
        (e: { fingerprint: string | null }) => fingerprint && e.fingerprint === fingerprint,
      );

      // Same phone already registered on a DIFFERENT device → likely fraud, block.
      if (samePhone && (!fingerprint || samePhone.fingerprint !== fingerprint)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Ce numéro possède déjà un compte KONGOSSA sur un autre appareil.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // This device already used with a different phone → block duplicate identity.
      if (sameDevice && sameDevice.phone !== normalized) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Cet appareil possède déjà un compte KONGOSSA.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // Same phone + same device = legitimate returning user → allow, no new row.
      return new Response(JSON.stringify({ ok: true, status: "returning" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Register the identity trace (private, for authorities only)
    if (fullName) {
      await supabase.from("identity_traces").insert({
        author_id: crypto.randomUUID(),
        full_name: String(fullName).slice(0, 120),
        phone: normalized,
        fingerprint: fingerprint ? String(fingerprint).slice(0, 128) : null,
      });
    }

    return new Response(JSON.stringify({ ok: true, status: "new" }), {
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
