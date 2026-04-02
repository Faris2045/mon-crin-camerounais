import { motion } from "framer-motion";

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-primary flex flex-col items-center justify-center"
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
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", damping: 12, delay: 0.3 }}
          className="text-6xl mb-4"
        >
          📢
        </motion.div>

        <motion.h1
          initial={{ letterSpacing: "0.5em", opacity: 0 }}
          animate={{ letterSpacing: "0.15em", opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl font-black text-primary-foreground tracking-widest"
        >
          KONGOSSA
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-primary-foreground/70 text-sm font-semibold mt-2"
        >
          Découvre ce qui se passe autour de toi
        </motion.p>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 120 }}
          transition={{ delay: 1.2, duration: 0.8, ease: "easeInOut" }}
          className="h-1 bg-primary-foreground/30 rounded-full mt-6"
          onAnimationComplete={onFinish}
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 text-primary-foreground/40 text-xs font-bold"
      >
        🇨🇲 Made in Cameroun
      </motion.p>
    </motion.div>
  );
}
