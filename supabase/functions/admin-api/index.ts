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
      const [identities, messages, alerts, comments] = await Promise.all([
        supabase.from("identity_traces").select("*").order("created_at", { ascending: false }),
        supabase.from("messages").select("*").order("created_at", { ascending: false }),
        supabase.from("alerts").select("*").order("created_at", { ascending: false }),
        supabase.from("comments").select("id"),
      ]);
      return json({
        ok: true,
        identities: identities.data ?? [],
        messages: messages.data ?? [],
        alerts: alerts.data ?? [],
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

    if (action === "delete-user") {
      // Remove a user's identity record and all their content
      await supabase.from("identity_traces").delete().eq("author_id", payload.authorId);
      await supabase.from("messages").delete().eq("author_id", payload.authorId);
      await supabase.from("alerts").delete().eq("author_id", payload.authorId);
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
