import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEFAULT_USER = "admin";
const DEFAULT_PASS = "kongossa2024";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, password, action, payload } = await req.json();

    const expectedUser = Deno.env.get("ADMIN_USERNAME") || DEFAULT_USER;
    const expectedPass = Deno.env.get("ADMIN_PASSWORD") || DEFAULT_PASS;

    if (username !== expectedUser || password !== expectedPass) {
      return new Response(JSON.stringify({ error: "Identifiants invalides" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "login") {
      return json({ ok: true });
    }

    if (action === "overview") {
      const [accounts, messages, alerts, comments, reports] = await Promise.all([
        supabase.from("accounts")
          .select("id, username, email, phone, fingerprint, device_user_id, email_verified, banned, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }),
        supabase.from("comments").select("id"),
        supabase.from("account_reports").select("*").order("created_at", { ascending: false }),
      ]);
      return json({
        ok: true,
        accounts: accounts.data ?? [],
        messages: messages.data ?? [],
        alerts: alerts.data ?? [],
        reports: reports.data ?? [],
        commentCount: comments.data?.length ?? 0,
      });
    }

    if (action === "resolve-alert") {
      await supabase
        .from("alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", payload.id);
      return json({ ok: true });
    }

    if (action === "delete-message") {
      await supabase.from("comments").delete().eq("message_id", payload.id);
      await supabase.from("messages").delete().eq("id", payload.id);
      return json({ ok: true });
    }

    if (action === "delete-alert") {
      await supabase.from("alerts").delete().eq("id", payload.id);
      return json({ ok: true });
    }

    // Account management -------------------------------------------------
    if (action === "delete-account") {
      await supabase.from("accounts").delete().eq("id", payload.id);
      return json({ ok: true });
    }

    if (action === "ban-account") {
      await supabase.from("accounts").update({ banned: payload.banned !== false }).eq("id", payload.id);
      return json({ ok: true });
    }

    // Content by a device handle (author_id)
    if (action === "delete-user-content") {
      await supabase.from("messages").delete().eq("author_id", payload.authorId);
      await supabase.from("alerts").delete().eq("author_id", payload.authorId);
      return json({ ok: true });
    }

    // Report management --------------------------------------------------
    if (action === "resolve-report") {
      await supabase.from("account_reports").update({ status: "resolved" }).eq("id", payload.id);
      return json({ ok: true });
    }

    if (action === "delete-report") {
      await supabase.from("account_reports").delete().eq("id", payload.id);
      return json({ ok: true });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400,
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

function json(obj: unknown) {
  return new Response(JSON.stringify(obj), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
