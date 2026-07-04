import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import bcrypt from "npm:bcryptjs@2.4.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { username, phone, password, fingerprint } = await req.json();

    const name = String(username ?? "").trim();
    const tel = String(phone ?? "").replace(/\s/g, "");
    const pwd = String(password ?? "");

    if (name.length < 2) return json({ ok: false, error: "Nom d'utilisateur trop court." });
    if (!/^[+0-9]{8,15}$/.test(tel)) return json({ ok: false, error: "Numéro de téléphone invalide." });
    if (pwd.length < 6) return json({ ok: false, error: "Mot de passe trop court (min. 6 caractères)." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only a phone number that ALREADY has an account blocks a new signup.
    const { data: existing } = await supabase
      .from("accounts")
      .select("id, phone, username")
      .or(`phone.eq.${tel},username.eq.${name}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.phone === tel) {
        return json({ ok: false, error: "Ce numéro possède déjà un compte. Connecte-toi." });
      }
      return json({ ok: false, error: "Ce nom d'utilisateur est déjà pris." });
    }

    const password_hash = bcrypt.hashSync(pwd, 10);

    const { data: created, error } = await supabase
      .from("accounts")
      .insert({
        username: name,
        phone: tel,
        password_hash,
        fingerprint: fingerprint ? String(fingerprint).slice(0, 128) : null,
      })
      .select("id, username, phone")
      .single();

    if (error || !created) {
      return json({ ok: false, error: "Impossible de créer le compte. Réessaie." });
    }

    return json({ ok: true, account: created });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Erreur serveur." }, 500);
  }
});
