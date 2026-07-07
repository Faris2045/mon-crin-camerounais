import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Users, Megaphone, Siren, Trash2, CheckCircle2, LogOut, RefreshCw, Lock, ArrowLeft,
  ShieldAlert, Ban, ShieldCheck, Mail, Fingerprint, Hash,
} from "lucide-react";

interface Account {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  fingerprint: string | null;
  device_user_id: string | null;
  email_verified: boolean;
  banned: boolean;
  created_at: string;
}
interface Message { id: string; text: string; author: string; author_id: string; likes: number; reported: boolean; created_at: string; }
interface Alert { id: string; author_id: string; author_name: string; message: string | null; status: string; lat: number; lng: number; created_at: string; }
interface Report {
  id: string; reported_author_id: string; reported_author_name: string; reason: string;
  reporter_id: string | null; message_id: string | null; status: string; created_at: string;
}

type Tab = "accounts" | "reports" | "messages" | "alerts";

export default function Admin() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");
  const [search, setSearch] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
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
      setAccounts(data.accounts ?? []);
      setMessages(data.messages ?? []);
      setAlerts(data.alerts ?? []);
      setReports(data.reports ?? []);
      setCommentCount(data.commentCount ?? 0);
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

  const deleteMessage = async (id: string) => { await call("delete-message", { id }); toast({ title: "Kongossa supprimé" }); loadData(); };
  const deleteAccount = async (id: string) => { await call("delete-account", { id }); toast({ title: "Compte supprimé" }); loadData(); };
  const banAccount = async (id: string, banned: boolean) => { await call("ban-account", { id, banned }); toast({ title: banned ? "Compte suspendu" : "Compte réactivé" }); loadData(); };
  const resolveAlert = async (id: string) => { await call("resolve-alert", { id }); toast({ title: "Alerte résolue" }); loadData(); };
  const deleteAlert = async (id: string) => { await call("delete-alert", { id }); toast({ title: "Alerte supprimée" }); loadData(); };
  const resolveReport = async (id: string) => { await call("resolve-report", { id }); toast({ title: "Signalement traité" }); loadData(); };
  const deleteReport = async (id: string) => { await call("delete-report", { id }); toast({ title: "Signalement supprimé" }); loadData(); };

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
            <Link
              to="/"
              className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Retour à l'application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) => !q || vals.some((v) => (v ?? "").toLowerCase().includes(q));

  const filteredAccounts = accounts.filter((u) => match(u.username, u.email, u.phone, u.device_user_id));
  const filteredMessages = messages.filter((m) => match(m.text, m.author));
  const filteredAlerts = alerts.filter((a) => match(a.author_name, a.message));
  const filteredReports = reports.filter((r) => match(r.reported_author_name, r.reason));

  const pendingReports = reports.filter((r) => r.status === "pending").length;

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "accounts", label: "Comptes", icon: Users, count: accounts.length },
    { id: "reports", label: "Signalements", icon: ShieldAlert, count: pendingReports },
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
        <Stat label="Comptes" value={accounts.length} />
        <Stat label="Signalements" value={pendingReports} />
        <Stat label="Kongossas" value={messages.length} />
        <Stat label="Alertes" value={alerts.filter((a) => a.status === "active").length} />
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 mb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      <div className="px-4 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, e-mail, identifiant…)"
          className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="px-4 space-y-2">
        {/* ACCOUNTS — full identity + moderation */}
        {tab === "accounts" && filteredAccounts.map((u) => (
          <div key={u.id} className={`bg-card rounded-2xl p-4 shadow-sm ${u.banned ? "border-2 border-destructive/40" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                {u.username}
                {u.email_verified
                  ? <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  : <ShieldAlert className="w-3.5 h-3.5 text-secondary" />}
                {u.banned && <span className="text-[10px] font-bold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">SUSPENDU</span>}
              </p>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => banAccount(u.id, !u.banned)} className={`p-2 rounded-xl active:scale-90 transition-transform ${u.banned ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary"}`} aria-label="Suspendre">
                  <Ban className="w-4 h-4" />
                </button>
                <button onClick={() => deleteAccount(u.id)} className="bg-destructive/10 text-destructive p-2 rounded-xl active:scale-90 transition-transform" aria-label="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5 break-all"><Mail className="w-3 h-3 shrink-0" /> {u.email || "—"}</p>
              {u.phone && <p className="flex items-center gap-1.5"><Hash className="w-3 h-3 shrink-0" /> {u.phone}</p>}
              <p className="flex items-center gap-1.5 break-all"><Hash className="w-3 h-3 shrink-0" /> ID appareil: {u.device_user_id || "—"}</p>
              <p className="flex items-center gap-1.5 break-all"><Fingerprint className="w-3 h-3 shrink-0" /> Empreinte: {u.fingerprint || "—"}</p>
              <p className="text-[10px] text-muted-foreground/70">Inscrit le {fmtDate(u.created_at)}</p>
            </div>
          </div>
        ))}
        {tab === "accounts" && filteredAccounts.length === 0 && <Empty text="Aucun compte" />}

        {/* REPORTS */}
        {tab === "reports" && filteredReports.map((r) => (
          <div key={r.id} className={`bg-card rounded-2xl p-4 shadow-sm ${r.status === "pending" ? "border-2 border-secondary/40" : ""}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-secondary" /> {r.reported_author_name}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === "pending" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary"}`}>
                {r.status === "pending" ? "À TRAITER" : "traité"}
              </span>
            </div>
            <p className="text-sm text-foreground">{r.reason}</p>
            <p className="text-[11px] text-muted-foreground mt-1 break-all">Compte signalé (ID appareil): {r.reported_author_id}</p>
            <p className="text-[11px] text-muted-foreground break-all">Signalé par: {r.reporter_id || "anonyme"}</p>
            <p className="text-[10px] text-muted-foreground mb-2">{fmtDate(r.created_at)}</p>
            <div className="flex gap-2">
              {r.status === "pending" && (
                <button onClick={() => resolveReport(r.id)} className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform">
                  <CheckCircle2 className="w-4 h-4" /> Marquer traité
                </button>
              )}
              <button onClick={() => deleteReport(r.id)} className="flex-1 bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        ))}
        {tab === "reports" && filteredReports.length === 0 && <Empty text="Aucun signalement" />}

        {/* MESSAGES */}
        {tab === "messages" && filteredMessages.map((m) => (
          <div key={m.id} className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">{m.author}</span>
              <button onClick={() => deleteMessage(m.id)} className="bg-destructive/10 text-destructive p-2 rounded-lg active:scale-90 transition-transform">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-foreground">{m.text}</p>
            <p className="text-[10px] text-muted-foreground mt-1">👍 {m.likes} · {fmtDate(m.created_at)} {m.reported ? "· ⚠️ signalé" : ""}</p>
          </div>
        ))}
        {tab === "messages" && filteredMessages.length === 0 && <Empty text="Aucun kongossa" />}

        {/* ALERTS */}
        {tab === "alerts" && filteredAlerts.map((a) => (
          <div key={a.id} className="bg-card rounded-2xl p-4 shadow-sm border-2 border-destructive/30">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-foreground">{a.author_name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                {a.status === "active" ? "ACTIVE" : "résolue"}
              </span>
            </div>
            <p className="text-sm text-foreground">{a.message || "Demande d'aide d'urgence"}</p>
            <p className="text-[10px] text-muted-foreground mb-1">{fmtDate(a.created_at)}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold underline">
              Voir la position
            </a>
            <div className="flex gap-2 mt-3">
              {a.status === "active" && (
                <button onClick={() => resolveAlert(a.id)} className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform">
                  <CheckCircle2 className="w-4 h-4" /> Résoudre
                </button>
              )}
              <button onClick={() => deleteAlert(a.id)} className="flex-1 bg-destructive/10 text-destructive text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform">
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        ))}
        {tab === "alerts" && filteredAlerts.length === 0 && <Empty text="Aucune alerte" />}
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

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}
