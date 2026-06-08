import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, Megaphone, Siren, Trash2, CheckCircle2, LogOut, RefreshCw, Lock, ArrowLeft,
} from "lucide-react";

interface Identity { id: string; author_id: string; full_name: string; phone: string; created_at: string; }
interface Message { id: string; text: string; author: string; author_id: string; likes: number; reported: boolean; created_at: string; }
interface Alert { id: string; author_id: string; author_name: string; message: string | null; status: string; lat: number; lng: number; created_at: string; }

type Tab = "users" | "messages" | "alerts";

export default function Admin() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("users");

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [commentCount, setCommentCount] = useState(0);

  const call = useCallback(
    async (action: string, payload?: unknown) => {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { username, password, action, payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    [username, password],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call("overview");
      setIdentities(data.identities);
      setMessages(data.messages);
      setAlerts(data.alerts);
      setCommentCount(data.commentCount);
    } catch {
      toast({ title: "Erreur", description: "Chargement impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await call("login");
      setAuthed(true);
      await loadData();
    } catch {
      toast({ title: "Connexion refusée", description: "Identifiants invalides", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    await call("delete-message", { id });
    toast({ title: "Kongossa supprimé" });
    loadData();
  };
  const deleteUser = async (authorId: string) => {
    await call("delete-user", { authorId });
    toast({ title: "Utilisateur supprimé" });
    loadData();
  };
  const resolveAlert = async (id: string) => {
    await call("resolve-alert", { id });
    toast({ title: "Alerte résolue" });
    loadData();
  };
  const deleteAlert = async (id: string) => {
    await call("delete-alert", { id });
    toast({ title: "Alerte supprimée" });
    loadData();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Admin KONGOSSA</h1>
            <p className="text-xs text-muted-foreground mt-1">Espace de gestion réservé</p>
          </div>
          <div className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Mot de passe"
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <div className="flex items-start gap-2 bg-muted rounded-xl p-3">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Identifiants par défaut : <span className="font-bold">admin</span> /{" "}
                <span className="font-bold">kongossa2024</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "users", label: "Utilisateurs", icon: Users, count: identities.length },
    { id: "messages", label: "Kongossas", icon: Megaphone, count: messages.length },
    { id: "alerts", label: "Alertes", icon: Siren, count: alerts.filter((a) => a.status === "active").length },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-primary text-primary-foreground px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <h1 className="text-lg font-black tracking-wide">Admin KONGOSSA</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 active:scale-90 transition-transform" aria-label="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setAuthed(false); setPassword(""); }} className="p-2 active:scale-90 transition-transform" aria-label="Déconnexion">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-2 px-4 py-4">
        <Stat label="Utilisateurs" value={identities.length} />
        <Stat label="Kongossas" value={messages.length} />
        <Stat label="Commentaires" value={commentCount} />
        <Stat label="Alertes" value={alerts.filter((a) => a.status === "active").length} />
      </div>

      <div className="flex gap-2 px-4 mb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      <div className="px-4 space-y-2">
        {tab === "users" && identities.map((u) => (
          <div key={u.id} className="bg-card rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.phone}</p>
              <p className="text-[10px] text-muted-foreground/70">ID: {u.author_id}</p>
            </div>
            <button
              onClick={() => deleteUser(u.author_id)}
              className="bg-destructive/10 text-destructive p-2.5 rounded-xl active:scale-90 transition-transform shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {tab === "users" && identities.length === 0 && <Empty text="Aucun utilisateur enregistré" />}

        {tab === "messages" && messages.map((m) => (
          <div key={m.id} className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">{m.author}</span>
              <button
                onClick={() => deleteMessage(m.id)}
                className="bg-destructive/10 text-destructive p-2 rounded-lg active:scale-90 transition-transform"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-foreground">{m.text}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              ❤️ {m.likes} {m.reported ? "· ⚠️ signalé" : ""}
            </p>
          </div>
        ))}
        {tab === "messages" && messages.length === 0 && <Empty text="Aucun kongossa" />}

        {tab === "alerts" && alerts.map((a) => (
          <div key={a.id} className="bg-card rounded-2xl p-4 shadow-sm border-2 border-destructive/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">{a.author_name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                {a.status === "active" ? "ACTIVE" : "résolue"}
              </span>
            </div>
            <p className="text-sm text-foreground">{a.message || "Demande d'aide d'urgence"}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-semibold underline"
            >
              Voir la position
            </a>
            <div className="flex gap-2 mt-3">
              {a.status === "active" && (
                <button
                  onClick={() => resolveAlert(a.id)}
                  className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" /> Résoudre
                </button>
              )}
              <button
                onClick={() => deleteAlert(a.id)}
                className="flex-1 bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        ))}
        {tab === "alerts" && alerts.length === 0 && <Empty text="Aucune alerte" />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl p-3 text-center shadow-sm">
      <p className="font-black text-foreground text-xl leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-semibold mt-1">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-muted-foreground text-sm py-10">{text}</p>;
}
