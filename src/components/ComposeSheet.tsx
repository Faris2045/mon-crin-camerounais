import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export default function ComposeSheet({ open, onClose, onSubmit }: Props) {
  const [text, setText] = useState("");
  const maxChars = 280;

  const handleSubmit = () => {
    if (text.trim().length === 0) return;
    onSubmit(text.trim());
    setText("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 p-5 safe-bottom shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-foreground">Lancer un kongossa 📢</h2>
              <button onClick={onClose} className="text-muted-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxChars))}
              placeholder="Qu'est-ce qui se passe autour de toi?..."
              className="w-full h-32 bg-background rounded-xl p-3 text-foreground text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-semibold ${text.length > maxChars - 20 ? "text-kongossa-hot" : "text-muted-foreground"}`}>
                {text.length}/{maxChars}
              </span>
              <button
                onClick={handleSubmit}
                disabled={text.trim().length === 0}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-40 transition-opacity active:scale-95"
              >
                <Send className="w-4 h-4" /> Publier
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
