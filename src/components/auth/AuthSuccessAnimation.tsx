import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface AuthSuccessAnimationProps {
  message: string;
  subMessage?: string;
}

const AuthSuccessAnimation = ({ message, subMessage }: AuthSuccessAnimationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-6 py-12"
    >
      {/* Animated checkmark circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative"
      >
        {/* Outer glow ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          style={{ width: 120, height: 120, margin: -20 }}
        />
        
        {/* Main circle */}
        <motion.div
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          >
            <Check className="w-10 h-10 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        </motion.div>

        {/* Sparkle particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: Math.cos((i * 60 * Math.PI) / 180) * 50,
              y: Math.sin((i * 60 * Math.PI) / 180) * 50,
            }}
            transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
        ))}
      </motion.div>

      {/* Success text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold gradient-text">{message}</h2>
        {subMessage && (
          <p className="text-muted-foreground">{subMessage}</p>
        )}
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex gap-1"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default AuthSuccessAnimation;
