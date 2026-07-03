import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, ShieldCheck, KeyRound, Fingerprint, LogIn, UserPlus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import logo from "@/assets/kongossa-logo.png";

interface Props {
  open: boolean;
  onSubmit: (fullName: string, phone: string) => void;
}

type Mode = "choose" | "signup" | "login";

export default function IdentitySetup({ open, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"info" | "verify">("info");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  if (!open) return null;

  const isLogin = mode === "login";

  const resetFlow = (m: Mode) => {
    setMode(m);
    setStep("info");
    setError("");
    setCode("");
    setDevCode(null);
  };

  const sendCode = async () => {
    const tel = phone.trim();
    if (!isLogin && fullName.trim().length < 2) {
      setError("Entre ton nom (au moins 2 lettres).");
      return;
    }
    if (!/^[+0-9\s]{8,15}$/.test(tel)) {
      setError("Entre un numéro de téléphone valide.");
      return;
    }
    setError("");
    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
      body: { phone: tel },
    });
    setLoading(false);
    if (fnError || !data?.ok) {
      setError("Impossible d'envoyer le code. Réessaie.");
      return;
    }
    setDevCode(data.devCode ?? null);
    setStep("verify");
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) {
      setError("Entre le code à 6 chiffres.");
      return;
    }
    setError("");
    setLoading(true);
    // Open-source hardware fingerprint (FingerprintJS) — anti-fraud & anti-duplicate.
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
      body: {
        phone: phone.trim(),
        code: code.trim(),
        fullName: isLogin ? undefined : fullName.trim(),
        fingerprint,
        mode: isLogin ? "login" : "signup",
      },
    });
    setLoading(false);
    if (fnError || !data?.ok) {
      setError(data?.error || "Code incorrect.");
      return;
    }
    // On login, the name comes back from the server; on signup we use the typed name.
    const resolvedName = (data.fullName && String(data.fullName)) || fullName.trim();
    onSubmit(resolvedName, phone.trim());
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
            <p className="text-xs font-bold text-primary mt-2">
              🔒 Anonyme pour les autres. Vérifié pour la sécurité.
            </p>
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

          {/* ---------- INFO STEP (signup + login) ---------- */}
          {mode !== "choose" && step === "info" && (
            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nom
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError(""); }}
                    placeholder="Ex: Jean Mbarga"
                    className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
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

              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

              {!isLogin && (
                <>
                  <div className="flex items-start gap-2 bg-primary/10 rounded-xl p-3">
                    <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      🔒 Ton nom et ton numéro ne sont jamais visibles par les autres utilisateurs.
                      Ils servent uniquement à sécuriser la communauté.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-secondary/10 rounded-xl p-3">
                    <Fingerprint className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                    <p className="text-[11px] text-foreground/80 leading-relaxed">
                      🛡️ Une empreinte matérielle sécurisée de ton appareil est enregistrée
                      (technologie open-source). Elle empêche les comptes en double et permet aux
                      autorités de tracer tout usage frauduleux.
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={sendCode}
                disabled={loading}
                className={`w-full bg-${accent} text-${accent}-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}
              >
                {loading ? "Envoi du code…" : "Recevoir le code de vérification"}
              </button>
              <button
                onClick={() => resetFlow("choose")}
                className="w-full text-muted-foreground font-semibold text-sm py-2 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
            </div>
          )}

          {/* ---------- VERIFY STEP ---------- */}
          {mode !== "choose" && step === "verify" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-muted rounded-xl p-3">
                <KeyRound className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Un code à 6 chiffres a été envoyé au <span className="font-bold">{phone}</span>{" "}
                  (par WhatsApp). Entre-le ci-dessous pour {isLogin ? "te connecter" : "vérifier ton numéro"}.
                </p>
              </div>

              {devCode && (
                <div className="bg-secondary/15 text-secondary rounded-xl p-3 text-xs font-bold text-center">
                  Mode test — votre code : <span className="text-base tracking-widest">{devCode}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Code de vérification
                </label>
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  placeholder="123456"
                  inputMode="numeric"
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

              <button
                onClick={verifyCode}
                disabled={loading}
                className={`w-full bg-${accent} text-${accent}-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform disabled:opacity-60`}
              >
                {loading ? "Vérification…" : isLogin ? "Se connecter" : "Vérifier et continuer"}
              </button>
              <button
                onClick={() => { setStep("info"); setCode(""); setError(""); }}
                className="w-full text-muted-foreground font-semibold text-sm py-2"
              >
                {isLogin ? "Modifier mon numéro" : "Modifier mes informations"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
