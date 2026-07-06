import { createClient } from "npm:@supabase/supabase-js@2";

export function makeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Sends a 6-digit verification code by email.
 * Uses the Lovable email queue (enqueue_email) when an email domain is
 * configured. Returns whether the code could actually be delivered.
 */
export async function sendCodeEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
  code: string,
): Promise<boolean> {
  const subject = "Ton code KONGOSSA";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;color:#1a1a1a">
      <h1 style="color:#00C49A;font-size:22px;margin:0 0 12px">KONGOSSA</h1>
      <p style="font-size:15px;margin:0 0 16px">Voici ton code de vérification :</p>
      <p style="font-size:34px;font-weight:800;letter-spacing:8px;color:#00C49A;margin:0 0 16px">${code}</p>
      <p style="font-size:13px;color:#666;margin:0">Ce code expire dans 10 minutes. Ne le partage avec personne.</p>
    </div>`;

  try {
    // Preferred path: Lovable transactional email function (if scaffolded)
    const { error: fnErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "verification-code",
        recipientEmail: email,
        idempotencyKey: `code-${email}-${code}`,
        templateData: { code },
      },
    });
    if (!fnErr) return true;
  } catch (_) { /* fall through */ }

  try {
    // Fallback: enqueue directly if the email queue exists
    const { error } = await supabase.rpc("enqueue_email", {
      p_to: email,
      p_subject: subject,
      p_html: html,
      p_purpose: "transactional",
    });
    if (!error) return true;
  } catch (_) { /* not configured yet */ }

  return false;
}
