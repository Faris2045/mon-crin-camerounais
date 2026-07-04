import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, KeyRound, Fingerprint, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { verifyFingerprint } from "@/lib/biometric";
import logo from "@/assets/kongossa-logo.png";

interface Props {
  open: boolean;
  onSubmit: (fullName: string, phone: string) => void;
}

type Mode = "choose" | "signup" | "login";

export default function IdentitySetup({ open, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  if (!open) return null;

  const isLogin = mode === "login";

  const resetFlow = (m: Mode) => {
    setMode(m);
    setError("");
    setPassword("");
    setScanning(false);
  };

  // After credentials are validated, require the fingerprint before logging in.
  const runFingerprintAndFinish = async (resolvedName: string, resolvedPhone: string) => {
    setScanning(true);
    setError("");
    const fp = await verifyFingerprint();
    setScanning(false);
    if (!fp.ok) {
      setError(fp.error || "Vérification par empreinte requise.");
      return;
    }
    onSubmit(resolvedName, resolvedPhone);
  };

  const handleSignup = async () => {
    const name = username.trim();
    const tel = phone.trim();
    if (name.length < 2) return setError("Entre un nom d'utilisateur (min. 2 lettres).");
    if (!/^[+0-9\s]{8,15}$/.test(tel)) return setError("Entre un numéro de téléphone valide.");
    if (password.length < 6) return setError("Mot de passe trop court (min. 6 caractères).");

    setError("");
    setLoading(true);
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data, error: fnError } = await supabase.functions.invoke("signup", {
      body: { username: name, phone: tel, password, fingerprint },
    });
    setLoading(false);
    if (fnError || !data?.ok) {
      return setError(data?.error || "Impossible de créer le compte. Réessaie.");
    }
    await runFingerprintAndFinish(name, tel);
  };

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id) return setError("Entre ton nom ou ton numéro.");
    if (!password) return setError("Entre ton mot de passe.");

    setError("");
    setLoading(true);
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data, error: fnError } = await supabase.functions.invoke("login", {
      body: { identifier: id, password, fingerprint },
    });
    setLoading(false);
    if (fnError || !data?.ok) {
      return setError(data?.error || "Connexion impossible.");
    }
    await runFingerprintAndFinish(data.account.username, data.account.phone);
  };

  const accentBtn = isLogin
    ? "bg-secondary text-secondary-foreground"
    : "bg-primary text-primary-foreground";

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-10 flex flex-col justify-center safe-top safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full mx-auto"
        >
          <div className="text-center mb-7">
            <img src={logo} alt="KONGOSSA" className="w-20 h-20 object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-black text-foreground tracking-wide">
              {mode === "choose" ? "BIENVENUE SUR KONGOSSA" : isLogin ? "SE CONNECTER" : "CRÉER UN COMPTE"}
            </h1>
          </div>

          {/* ---------- CHOICE SCREEN ---------- */}
          {mode === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
                Déjà un compte ? Connecte-toi. Sinon, crée ton compte en quelques secondes.
              </p>
              <button
                onClick={() => resetFlow("signup")}
                className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" /> Créer un compte
              </button>
              <button
                onClick={() => resetFlow("login")}
                className="w-full bg-secondary text-secondary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" /> J'ai déjà un compte
              </button>
            </div>
          )}

          {/* ---------- SIGNUP ---------- */}
          {mode === "signup" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nom d'utilisateur
                </label>
                <input
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  placeholder="Ex: Jean237"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
                </label>
                <input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(""); }}
                  placeholder="Ex: +237 6 99 99 99 99"
                  inputMode="tel"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Au moins 6 caractères"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

              {scanning && (
                <div className="flex items-center justify-center gap-2 text-primary text-sm font-bold py-1">
                  <Fingerprint className="w-5 h-5 animate-pulse" /> Vérification par empreinte…
                </div>
              )}

              <button
                onClick={handleSignup}
                disabled={loading || scanning}
                className={`w-full ${accentBtn} font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}
              >
                {loading ? "Création…" : "Créer mon compte"}
              </button>
              <button
                onClick={() => resetFlow("choose")}
                className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
            </div>
          )}

          {/* ---------- LOGIN ---------- */}
          {mode === "login" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Nom d'utilisateur ou numéro
                </label>
                <input
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                  placeholder="Ex: Jean237 ou +237699999999"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Ton mot de passe"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

              {scanning && (
                <div className="flex items-center justify-center gap-2 text-secondary text-sm font-bold py-1">
                  <Fingerprint className="w-5 h-5 animate-pulse" /> Vérification par empreinte…
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || scanning}
                className={`w-full ${accentBtn} font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}
              >
                {loading ? "Connexion…" : "Se connecter"}
              </button>
              <button
                onClick={() => resetFlow("choose")}
                className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
