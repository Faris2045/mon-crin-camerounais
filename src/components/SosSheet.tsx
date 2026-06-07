import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, X, Send, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<boolean>;
  locationError: boolean;
}

const QUICK_REASONS = ["Agression", "Accident", "Vol", "Incendie", "Malaise", "Danger"];

export default function SosSheet({ open, onClose, onSend, locationError }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const ok = await onSend(message.trim());
    setSending(false);
    if (ok) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setMessage("");
        onClose();
      }, 1800);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 bg-card rounded-t-3xl z-50 p-5 safe-bottom"
          >
            {sent ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4"
                >
                  <Siren className="w-8 h-8 text-destructive" />
                </motion.div>
                <h2 className="text-lg font-black text-foreground">Alerte envoyée 🚨</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Les personnes autour de toi sont prévenues et peuvent te localiser.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Siren className="w-5 h-5 text-destructive" />
                    <h2 className="text-lg font-black text-foreground">Alerte d'urgence</h2>
                  </div>
                  <button onClick={onClose} className="text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Ton alerte et ta position seront partagées immédiatement avec les personnes
                  proches. Elle dépasse le rayon habituel pour que plus de monde puisse réagir.
                </p>

                {locationError && (
                  <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl p-3 mb-3 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Active la localisation pour que l'on puisse te retrouver.
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {QUICK_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setMessage(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        message === r
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Donne plus de détails sur le lieu (par exemple secteur, rue, entrée…) et décris brièvement la situation"
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-destructive resize-none mb-4"
                />

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-destructive text-destructive-foreground font-black py-4 rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-5 h-5" />
                  {sending ? "Envoi…" : "ENVOYER L'ALERTE"}
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
