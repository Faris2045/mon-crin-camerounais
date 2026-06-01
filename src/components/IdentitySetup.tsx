import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, Phone, Lock } from "lucide-react";
import logo from "@/assets/kongossa-logo.png";

interface Props {
  open: boolean;
  onSubmit: (fullName: string, phone: string) => void;
}

export default function IdentitySetup({ open, onSubmit }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    const name = fullName.trim();
    const tel = phone.trim();
    if (name.length < 3) {
      setError("Entre ton nom complet (au moins 3 lettres).");
      return;
    }
    if (!/^[+0-9\s]{8,15}$/.test(tel)) {
      setError("Entre un numéro de téléphone valide.");
      return;
    }
    onSubmit(name, tel);
  };

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
            <h1 className="text-2xl font-black text-foreground tracking-wide">IDENTITÉ CONFIDENTIELLE</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Votre identité n'est <span className="font-bold text-foreground">jamais affichée</span> aux autres
              utilisateurs. Elle sert uniquement à lutter contre les faux comptes, les abus et les activités
              illégales.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nom complet
              </label>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                placeholder="Ex: Jean Mbarga"
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

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

            <div className="flex items-start gap-2 bg-muted rounded-xl p-3">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Données chiffrées et confidentielles. Jamais visibles publiquement, jamais
                partagées sauf réquisition légale.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-primary text-primary-foreground font-extrabold py-3.5 rounded-xl active:scale-95 transition-transform"
            >
              Continuer
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
