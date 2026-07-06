import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, KeyRound, Fingerprint, LogIn, UserPlus, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { optionalFingerprint } from "@/lib/biometric";
import logo from "@/assets/kongossa-logo.png";

interface Props {
  open: boolean;
  onSubmit: (username: string, email: string) => void;
}

type Mode = "choose" | "signup" | "verify" | "login";

export default function IdentitySetup({ open, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  if (!open) return null;

  const isLogin = mode === "login";

  const reset = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
    setPassword("");
    setCode("");
    setScanning(false);
  };

  // Optional fingerprint unlock, then finish — never blocks the user.
  const finish = async (name: string, mail: string) => {
    setScanning(true);
    await optionalFingerprint(); // "ok" | "skipped" | "failed" — all continue
    setScanning(false);
    onSubmit(name, mail);
  };

  const handleSignup = async () => {
    const name = username.trim();
    const mail = email.trim().toLowerCase();
    if (name.length < 3) return setError("Nom d'utilisateur trop court (min. 3 caractères).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setError("Entre une adresse e-mail valide.");
    if (password.length < 8) return setError("Mot de passe trop court (min. 8 caractères).");

    setError("");
    setLoading(true);
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data, error: fnError } = await supabase.functions.invoke("signup", {
      body: { username: name, email: mail, password, fingerprint },
    });
    setLoading(false);
    if (fnError || !data?.ok) return setError(data?.error || "Impossible de créer le compte. Réessaie.");

    if (data.requiresCode) {
      setPendingEmail(mail);
      setPendingName(name);
      setPendingPassword(password);
      setCode("");
      setInfo(`Un code à 6 chiffres a été envoyé à ${mail}.`);
      setMode("verify");
      return;
    }
    // Delivery not active yet: account created directly.
    await finish(name, mail);
  };

  const handleVerify = async () => {
    const otp = code.trim();
    if (otp.length !== 6) return setError("Entre le code à 6 chiffres.");
    setError("");
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("verify-email-code", {
      body: { email: pendingEmail, code: otp },
    });
    setLoading(false);
    if (fnError || !data?.ok) return setError(data?.error || "Code incorrect.");
    await finish(pendingName, pendingEmail);
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data } = await supabase.functions.invoke("signup", {
      body: { username: pendingName, email: pendingEmail, password: "__resend__", fingerprint },
    });
    setLoading(false);
    if (data?.requiresCode) setInfo("Nouveau code envoyé.");
  };

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id) return setError("Entre ton nom d'utilisateur ou ton e-mail.");
    if (!password) return setError("Entre ton mot de passe.");

    setError("");
    setLoading(true);
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data, error: fnError } = await supabase.functions.invoke("login", {
      body: { identifier: id, password, fingerprint },
    });
    setLoading(false);
    if (fnError || !data?.ok) return setError(data?.error || "Connexion impossible.");
    await finish(data.account.username, data.account.email);
  };

  const accentBtn = isLogin ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground";
  const title =
    mode === "choose" ? "BIENVENUE SUR KONGOSSA"
    : mode === "login" ? "SE CONNECTER"
    : mode === "verify" ? "VÉRIFIE TON E-MAIL"
    : "CRÉER UN COMPTE";

  const inputCls =
    "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col justify-center safe-top safe-bottom">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full mx-auto">
          <div className="text-center mb-7">
            <img src={logo} alt="KONGOSSA" className="w-20 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black text-foreground tracking-wide">{title}</h1>
          </div>

          {/* CHOICE */}
          {mode === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
                Déjà un compte ? Connecte-toi. Sinon, crée ton compte en quelques secondes.
              </p>
              <button onClick={() => reset("signup")} className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                <UserPlus className="w-5 h-5" /> Créer un compte
              </button>
              <button onClick={() => reset("login")} className="w-full bg-secondary text-secondary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" /> J'ai déjà un compte
              </button>
            </div>
          )}

          {/* SIGNUP */}
          {mode === "signup" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nom d'utilisateur</label>
                <input value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder="Ex: Jean237" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Adresse e-mail</label>
                <input value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="Ex: jean@email.com" inputMode="email" autoCapitalize="none" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Mot de passe</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Au moins 8 caractères" className={inputCls} />
              </div>
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              {scanning && <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold py-1"><Fingerprint className="w-5 h-5 animate-pulse" /> Déverrouillage…</div>}
              <button onClick={handleSignup} disabled={loading || scanning} className={`w-full ${accentBtn} font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}>
                {loading ? "Création…" : "Créer mon compte"}
              </button>
              <button onClick={() => reset("choose")} className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Retour</button>
            </div>
          )}

          {/* VERIFY */}
          {mode === "verify" && (
            <div className="space-y-4">
              {info && <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {info}</p>}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Code à 6 chiffres</label>
                <input value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} placeholder="______" inputMode="numeric" className={`${inputCls} text-center text-2xl tracking-[0.5em] font-black`} />
              </div>
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              {scanning && <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold py-1"><Fingerprint className="w-5 h-5 animate-pulse" /> Déverrouillage…</div>}
              <button onClick={handleVerify} disabled={loading || scanning} className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60">
                {loading ? "Vérification…" : "Vérifier"}
              </button>
              <button onClick={handleResend} disabled={loading} className="w-full text-primary font-semibold text-sm py-2">Renvoyer le code</button>
              <button onClick={() => reset("signup")} className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Retour</button>
            </div>
          )}

          {/* LOGIN */}
          {mode === "login" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Nom d'utilisateur ou e-mail</label>
                <input value={identifier} onChange={(e) => { setIdentifier(e.target.value); setError(""); }} placeholder="Ex: Jean237 ou jean@email.com" autoCapitalize="none" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Mot de passe</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Ton mot de passe" className={inputCls} />
              </div>
              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
              {scanning && <div className="flex items-center justify-center gap-2 text-secondary text-sm font-bold py-1"><Fingerprint className="w-5 h-5 animate-pulse" /> Déverrouillage…</div>}
              <button onClick={handleLogin} disabled={loading || scanning} className={`w-full ${accentBtn} font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}>
                {loading ? "Connexion…" : "Se connecter"}
              </button>
              <button onClick={() => reset("choose")} className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Retour</button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
