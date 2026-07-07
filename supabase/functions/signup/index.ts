import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import bcrypt from "npm:bcryptjs@2.4.3";

const makeCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Attempts to deliver a 6-digit code by email. Returns true only if delivered.
async function sendCodeEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  code: string,
): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;color:#1a1a1a">
      <h1 style="color:#00C49A;font-size:22px;margin:0 0 12px">KONGOSSA</h1>
      <p style="font-size:15px;margin:0 0 16px">Voici ton code de vérification :</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;color:#00C49A;margin:0 0 16px">${code}</p>
      <p style="font-size:13px;color:#666;margin:0">Ce code expire dans 10 minutes. Ne le partage avec personne.</p>
    </div>`;
  try {
    const { error } = await supabase.rpc("enqueue_email", {
      p_to: email,
      p_subject: "Ton code KONGOSSA",
      p_html: html,
      p_purpose: "transactional",
    });
    if (!error) return true;
  } catch (_) { /* email domain not configured yet */ }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { username, email, password, fingerprint, deviceUserId } = await req.json();

    const name = String(username ?? "").trim();
    const mail = String(email ?? "").trim().toLowerCase();
    const pwd = String(password ?? "");

    if (name.length < 3) return json({ ok: false, error: "Nom d'utilisateur trop court (min. 3 caractères)." });
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(name)) return json({ ok: false, error: "Nom d'utilisateur invalide (lettres, chiffres, . _ -)." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return json({ ok: false, error: "Adresse e-mail invalide." });
    if (pwd.length < 8) return json({ ok: false, error: "Mot de passe trop court (min. 8 caractères)." });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Reject duplicates (case-insensitive) on a VERIFIED account.
    const { data: existing } = await supabase
      .from("accounts")
      .select("id, email, username, email_verified")
      .or(`email.ilike.${mail},username.ilike.${name}`)
      .limit(5);

    const emailTaken = existing?.find((e: any) => (e.email ?? "").toLowerCase() === mail);
    const nameTaken = existing?.find((e: any) => (e.username ?? "").toLowerCase() === name.toLowerCase());

    if (emailTaken?.email_verified) return json({ ok: false, error: "Cet e-mail possède déjà un compte. Connecte-toi." });
    if (nameTaken?.email_verified) return json({ ok: false, error: "Ce nom d'utilisateur est déjà pris." });
    if (nameTaken && !emailTaken) return json({ ok: false, error: "Ce nom d'utilisateur est déjà pris." });

    const password_hash = bcrypt.hashSync(pwd, 10);
    const fp = fingerprint ? String(fingerprint).slice(0, 128) : null;

    const dev = deviceUserId ? String(deviceUserId).slice(0, 64) : null;

    // Create or refresh an unverified account for this email.
    let accountId = emailTaken?.id as string | undefined;
    if (accountId) {
      await supabase.from("accounts").update({
        username: name, password_hash, fingerprint: fp, device_user_id: dev, email_verified: false,
      }).eq("id", accountId);
    } else {
      const { data: created, error } = await supabase.from("accounts").insert({
        username: name, email: mail, password_hash, fingerprint: fp, device_user_id: dev, email_verified: false,
      }).select("id").single();
      if (error || !created) return json({ ok: false, error: "Impossible de créer le compte. Réessaie." });
      accountId = created.id;
    }

    // Generate + store a fresh code, invalidating older ones for this email.
    const code = makeCode();
    await supabase.from("email_verifications").update({ verified: true }).eq("email", mail).eq("verified", false);
    await supabase.from("email_verifications").insert({ email: mail, code, purpose: "signup" });

    const delivered = await sendCodeEmail(supabase, mail, code);

    if (!delivered) {
      // Email delivery not configured yet: auto-verify so users aren't locked out.
      await supabase.from("accounts").update({ email_verified: true }).eq("id", accountId);
      await supabase.from("email_verifications").update({ verified: true }).eq("email", mail).eq("verified", false);
      return json({ ok: true, requiresCode: false, email: mail, username: name });
    }

    return json({ ok: true, requiresCode: true, email: mail, username: name });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "Erreur serveur." }, 500);
  }
});
