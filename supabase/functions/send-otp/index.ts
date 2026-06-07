import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || !/^[+0-9\s]{8,20}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Numéro invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = phone.replace(/\s/g, "");
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("phone_verifications").insert({
      phone: normalized,
      code,
    });

    // Try to send a real SMS via Twilio if configured
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_PHONE_NUMBER");
    let smsSent = false;

    if (sid && token && from) {
      try {
        const body = new URLSearchParams({
          To: normalized,
          From: from,
          Body: `KONGOSSA: votre code de vérification est ${code}`,
        });
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${sid}:${token}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
          },
        );
        smsSent = res.ok;
        if (!res.ok) console.error("Twilio error:", await res.text());
      } catch (e) {
        console.error("Twilio send failed:", e);
      }
    }

    // When no SMS provider is configured, return the code so testing works end-to-end.
    return new Response(
      JSON.stringify({ ok: true, smsSent, devCode: smsSent ? undefined : code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
