import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { email, code } = await req.json();
    const mail = String(email ?? "").trim().toLowerCase();
    const otp = String(code ?? "").trim();

    if (!mail || !otp) return json({ ok: false, error: "Données manquantes." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", mail)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json({ ok: false, error: "Code expiré ou introuvable. Renvoie un code." });
    if (row.attempts >= 5) return json({ ok: false, error: "Trop de tentatives. Renvoie un code." });

    if (otp !== row.code) {
      await supabase.from("email_verifications").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ ok: false, error: "Code incorrect." });
    }

    await supabase.from("email_verifications").update({ verified: true }).eq("id", row.id);

    const { data: account } = await supabase
      .from("accounts")
      .update({ email_verified: true })
      .eq("email", mail)
      .select("id, username, email")
      .maybeSingle();

    if (!account) return json({ ok: false, error: "Compte introuvable." });

    return json({ ok: true, account: { username: account.username, email: account.email } });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Erreur serveur." }, 500);
  }
});
