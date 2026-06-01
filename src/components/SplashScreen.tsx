import { motion } from "framer-motion";
import logo from "@/assets/kongossa-logo.png";

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(circle at 50% 35%, #0b3d36 0%, #041d1a 70%)" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
        className="flex flex-col items-center"
      >
        <motion.img
          src={logo}
          alt="KONGOSSA"
          initial={{ y: -20, scale: 0.8 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 0.2 }}
          className="w-40 h-40 object-contain mb-4 drop-shadow-2xl"
        />

        <motion.h1
          initial={{ letterSpacing: "0.5em", opacity: 0 }}
          animate={{ letterSpacing: "0.15em", opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl font-black text-white tracking-widest"
        >
          KONGOSSA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-white/70 text-sm font-semibold mt-2 text-center px-8"
        >
          Ce que tout le monde voit, mais personne ne dit
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ delay: 1.2, duration: 0.8, ease: "easeInOut" }}
          className="h-1 bg-white/30 rounded-full mt-6"
          onAnimationComplete={onFinish}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-white/40 text-xs font-bold"
      >
        📍 Informe · Alerte · Protège
      </motion.p>
    </motion.div>
  );
}
