import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import bcrypt from "npm:bcryptjs@2.4.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { identifier, password, fingerprint, deviceUserId } = await req.json();

    const id = String(identifier ?? "").trim();
    const pwd = String(password ?? "");
    if (!id) return json({ ok: false, error: "Entre ton nom d'utilisateur ou ton e-mail." });
    if (!pwd) return json({ ok: false, error: "Entre ton mot de passe." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Match by email OR username, case-insensitive.
    const { data: account } = await supabase
      .from("accounts")
      .select("id, username, email, password_hash, fingerprint, email_verified")
      .or(`email.ilike.${id},username.ilike.${id}`)
      .limit(1)
      .maybeSingle();

    if (!account) return json({ ok: false, error: "Aucun compte trouvé. Crée un compte d'abord." });

    const valid = bcrypt.compareSync(pwd, account.password_hash);
    if (!valid) return json({ ok: false, error: "Identifiants incorrects." });

    // Keep the device fingerprint fresh (e.g. after reinstall).
    if (fingerprint && account.fingerprint !== fingerprint) {
      await supabase.from("accounts")
        .update({ fingerprint: String(fingerprint).slice(0, 128) })
        .eq("id", account.id);
    }

    return json({ ok: true, account: { username: account.username, email: account.email } });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Erreur serveur." }, 500);
  }
});
