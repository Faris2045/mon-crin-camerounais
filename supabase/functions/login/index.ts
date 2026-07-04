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
    const { identifier, password, fingerprint } = await req.json();

    const id = String(identifier ?? "").trim();
    const pwd = String(password ?? "");
    if (!id) return json({ ok: false, error: "Entre ton nom ou ton numéro." });
    if (!pwd) return json({ ok: false, error: "Entre ton mot de passe." });

    const tel = id.replace(/\s/g, "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Match by phone OR username.
    const { data: account } = await supabase
      .from("accounts")
      .select("id, username, phone, password_hash, fingerprint")
      .or(`phone.eq.${tel},username.eq.${id}`)
      .limit(1)
      .maybeSingle();

    if (!account) {
      return json({ ok: false, error: "Aucun compte trouvé. Crée un compte d'abord." });
    }

    const valid = bcrypt.compareSync(pwd, account.password_hash);
    if (!valid) {
      return json({ ok: false, error: "Mot de passe incorrect." });
    }

    // Keep the device fingerprint fresh (e.g. after reinstall).
    if (fingerprint && account.fingerprint !== fingerprint) {
      await supabase
        .from("accounts")
        .update({ fingerprint: String(fingerprint).slice(0, 128) })
        .eq("id", account.id);
    }

    return json({
      ok: true,
      account: { id: account.id, username: account.username, phone: account.phone },
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Erreur serveur." }, 500);
  }
});
